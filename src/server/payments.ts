import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";
import { transaction, type DB } from "./db";
import {
  audit,
  owned,
  validatePlanForOrder,
  type Plan,
} from "./payments-support";
import type { User } from "./auth";
import { fail } from "./errors";
import { jsonBody } from "./http";
type Order = {
  id: string;
  owner_id: string;
  invitation_id: string;
  plan_snapshot: Plan;
  amount_minor: number;
  currency: string;
  status: string;
  preference_id: string | null;
  checkout_url: string | null;
};
export function paymentConfigured() {
  return (
    process.env.PAYMENTS_ENABLED === "true" &&
    ["sandbox", "production"].includes(process.env.MERCADOPAGO_ENV ?? "") &&
    !!(
      process.env.MERCADOPAGO_ACCESS_TOKEN &&
      process.env.MERCADOPAGO_WEBHOOK_SECRET &&
      process.env.MERCADOPAGO_COLLECTOR_ID &&
      process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
    )
  );
}
async function mp(path: string, init?: RequestInit) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!r.ok)
    fail(
      503,
      "Mercado Pago no respondió correctamente. La orden sigue pendiente.",
    );
  return r.json();
}
export async function createOrder(user: User, eventId: string, planId: string) {
  if (!paymentConfigured())
    fail(
      503,
      "Configuración pendiente: precios, credenciales de Mercado Pago y URL HTTPS",
    );
  return transaction(async (db) => {
    const i = await owned(db, eventId, user, true);
    const p = (
      await db.query<Plan>("select * from plans where id=$1 and active=true", [
        planId,
      ])
    ).rows[0];
    if (!p?.price_minor)
      fail(503, "El precio de este plan todavía no está configurado");
    try {
      validatePlanForOrder(i.draft_json, p.entitlements);
    } catch (e) {
      fail(403, (e as Error).message);
    }
    const existing = (
      await db.query<Order>(
        "select * from orders where invitation_id=$1 and owner_id=$2 and status='pending' and plan_snapshot->>'id'=$3 order by created_at desc limit 1",
        [eventId, user.id, planId],
      )
    ).rows[0];
    if (existing) return { id: existing.id };
    const id = randomUUID();
    await db.query(
      "insert into orders(id,owner_id,invitation_id,plan_snapshot,amount_minor,currency) values($1,$2,$3,$4,$5,$6)",
      [id, user.id, eventId, JSON.stringify(p), p.price_minor, p.currency],
    );
    await audit(db, user.id, "order.create", id);
    return { id };
  });
}
export async function checkout(user: User, id: string) {
  if (!paymentConfigured())
    fail(503, "Mercado Pago está pendiente de configuración");
  return transaction(async (db) => {
    const o = (
      await db.query<Order>("select * from orders where id=$1 for update", [
        z.uuid().parse(id),
      ])
    ).rows[0];
    if (!o || o.owner_id !== user.id) fail(404, "Orden no encontrada");
    if (o.status !== "pending") fail(409, "La orden ya fue procesada");
    if (o.checkout_url) return { url: o.checkout_url };
    const base = process.env.NEXT_PUBLIC_APP_URL!;
    const pref = await mp("/checkout/preferences", {
      method: "POST",
      headers: { "X-Idempotency-Key": o.id },
      body: JSON.stringify({
        items: [
          {
            id: o.plan_snapshot.id,
            title: `Pixvo Invitaciones · ${o.plan_snapshot.name}`,
            quantity: 1,
            currency_id: o.currency,
            unit_price: o.amount_minor / 100,
          },
        ],
        external_reference: o.id,
        notification_url: `${base}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${base}/app/pagos`,
          failure: `${base}/app/pagos`,
          pending: `${base}/app/pagos`,
        },
        auto_return: "approved",
      }),
    });
    const url =
      process.env.MERCADOPAGO_ENV === "production"
        ? pref.init_point
        : pref.sandbox_init_point;
    if (
      typeof url !== "string" ||
      !/^https:\/\/(?:[a-z0-9-]+\.)?mercadopago\.com(?:\.ar)?\//.test(url)
    )
      fail(503, "Checkout no disponible en el entorno configurado");
    await db.query(
      "update orders set preference_id=$1,checkout_url=$2 where id=$3",
      [String(pref.id), url, o.id],
    );
    return { url };
  });
}
export function verifySignature(
  dataId: string,
  requestId: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const fields = Object.fromEntries(
    signature.split(",").map((s) => s.trim().split("=")),
  );
  const ts = fields.ts,
    v1 = fields.v1;
  if (
    !dataId ||
    !requestId ||
    !ts ||
    !/^\d{10,13}$/.test(ts) ||
    !v1 ||
    !/^[a-f0-9]{64}$/i.test(v1)
  )
    return false;
  const time = ts.length === 13 ? Number(ts) : Number(ts) * 1000;
  if (Math.abs(now - time) > 300000) return false;
  const expected = createHmac("sha256", secret)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(v1, "hex"));
}
export const providerPaymentSchema = z.object({
  id: z.union([z.string(), z.number()]),
  external_reference: z.uuid(),
  collector_id: z.union([z.string(), z.number()]),
  transaction_amount: z.number().positive(),
  currency_id: z.string(),
  status: z.enum([
    "approved",
    "pending",
    "in_process",
    "authorized",
    "rejected",
    "cancelled",
    "refunded",
    "charged_back",
    "in_mediation",
  ]),
  live_mode: z.boolean(),
  date_last_updated: z.string(),
});
export type ProviderPayment = z.infer<typeof providerPaymentSchema>;
export async function applyPayment(
  db: DB,
  input: ProviderPayment,
  collector: string,
  live: boolean,
) {
  const p = providerPaymentSchema.parse(input),
    provider = String(p.id),
    o = (
      await db.query<Order>("select * from orders where id=$1 for update", [
        p.external_reference,
      ])
    ).rows[0];
  if (!o) fail(422, "Orden desconocida");
  if (
    String(p.collector_id) !== collector ||
    p.live_mode !== live ||
    p.currency_id !== o.currency ||
    Math.abs(p.transaction_amount * 100 - o.amount_minor) > 0.001
  )
    fail(422, "El pago no coincide con la orden");
  const previous = (
    await db.query<{ order_id: string; updated_at: string }>(
      "select order_id,updated_at from payments where provider_id=$1",
      [provider],
    )
  ).rows[0];
  if (previous && previous.order_id !== o.id)
    fail(422, "El pago está asociado a otra orden");
  const key = `payment:${provider}:${p.status}:${p.date_last_updated}`;
  if (
    (
      await db.query(
        "select provider_event_id from webhook_events where provider_event_id=$1",
        [key],
      )
    ).rows.length
  )
    return { duplicate: true };
  const updated = new Date(p.date_last_updated);
  if (!Number.isFinite(updated.getTime())) fail(422, "Fecha de pago inválida");
  if (previous && new Date(previous.updated_at) > updated)
    return { stale: true };
  await db.query(
    "insert into payments(provider_id,order_id,status,amount_minor,currency,updated_at) values($1,$2,$3,$4,$5,$6) on conflict(provider_id) do update set status=$3,updated_at=$6",
    [provider, o.id, p.status, o.amount_minor, o.currency, p.date_last_updated],
  );
  const status =
    p.status === "approved"
      ? "approved"
      : ["refunded", "charged_back"].includes(p.status)
        ? p.status
        : ["rejected", "cancelled"].includes(p.status)
          ? "rejected"
          : "pending";
  // A later pending/rejected attempt cannot revoke a separately approved payment.
  const approval =
    (
      await db.query(
        "select provider_id from payments where order_id=$1 and status='approved'",
        [o.id],
      )
    ).rows.length > 0;
  const effective = approval ? "approved" : status;
  await db.query("update orders set status=$1 where id=$2", [effective, o.id]);
  const i = (
    await db.query<{ entitlement_order_id: string | null }>(
      "select entitlement_order_id from invitations where id=$1 for update",
      [o.invitation_id],
    )
  ).rows[0];
  if (
    effective === "approved" &&
    o.status !== "approved" &&
    i.entitlement_order_id !== o.id
  ) {
    await db.query(
      "update invitations set entitlement=$1,entitlement_order_id=$2,republications=0,expires_at=now()+($3*interval '1 day') where id=$4",
      [
        JSON.stringify(o.plan_snapshot.entitlements),
        o.id,
        o.plan_snapshot.entitlements.validDays,
        o.invitation_id,
      ],
    );
    await audit(db, null, "payment.entitlement", o.id);
  }
  if (
    ["refunded", "charged_back"].includes(effective) &&
    i.entitlement_order_id === o.id
  ) {
    await db.query(
      "update invitations set status='paused',entitlement=null where id=$1",
      [o.invitation_id],
    );
    await audit(db, null, "payment.review_required", o.id);
  }
  await db.query(
    "insert into webhook_events(provider_event_id,processed_at,result) values($1,now(),$2)",
    [key, effective],
  );
  return { processed: true };
}
export async function webhook(request: Request) {
  if (!paymentConfigured()) fail(503, "Webhook pendiente de configuración");
  const url = new URL(request.url),
    id = url.searchParams.get("data.id") ?? "",
    rid = request.headers.get("x-request-id") ?? "";
  if (
    !verifySignature(
      id,
      rid,
      request.headers.get("x-signature") ?? "",
      process.env.MERCADOPAGO_WEBHOOK_SECRET!,
    )
  )
    fail(401, "Firma de webhook inválida");
  const body = await jsonBody(request);
  if (
    body.type !== "payment" ||
    String(body.data?.id).toLowerCase() !== id.toLowerCase()
  )
    fail(422, "Notificación incompatible");
  const p = providerPaymentSchema.parse(
    await mp(`/v1/payments/${encodeURIComponent(id)}`),
  );
  if (String(p.id).toLowerCase() !== id.toLowerCase())
    fail(422, "Identificador de pago incorrecto");
  return transaction((db) =>
    applyPayment(
      db,
      p,
      process.env.MERCADOPAGO_COLLECTOR_ID!,
      process.env.MERCADOPAGO_ENV === "production",
    ),
  );
}
