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
import { parseCheckoutResponse } from "./mercadopago-response";
type Order = {
  id: string;
  owner_id: string;
  invitation_id: string;
  plan_snapshot: Plan;
  amount_minor: number;
  currency: string;
  status: string;
  preference_id: string | null;
  mercadopago_order_id: string | null;
  payment_environment: string | null;
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
async function providerRequest(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
    redirect: "error",
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
const mp = (path: string, init?: RequestInit) =>
  providerRequest(`https://api.mercadopago.com${path}`, init);

// Orders responses do not document live_mode. Verify the token's actual
// seller account instead of trusting a token prefix or unsigned body fields.
async function providerAccount() {
  const result = z
    .object({
      id: z.union([z.string(), z.number()]).transform(String),
      tags: z.array(z.string()),
    })
    .safeParse(await providerRequest("https://api.mercadolibre.com/users/me"));
  if (!result.success)
    fail(503, "No se pudo verificar la cuenta de Mercado Pago");
  const account = {
    id: result.data.id,
    live: !result.data.tags.includes("test_user"),
  };
  if (
    account.id !== process.env.MERCADOPAGO_COLLECTOR_ID ||
    account.live !== (process.env.MERCADOPAGO_ENV === "production")
  )
    fail(
      503,
      "La cuenta de Mercado Pago no corresponde al vendedor o entorno configurado",
    );
  return account;
}
const money = z
  .string()
  .max(18)
  .regex(/^\d+(?:\.\d{1,2})?$/);
function minor(value: string) {
  const [whole, cents = ""] = value.split(".");
  const amount = BigInt(whole) * 100n + BigInt(cents.padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) fail(422, "Importe inválido");
  return Number(amount);
}
export const providerOrderSchema = z.object({
  id: z.string().regex(/^ORD[A-Z0-9]+$/),
  type: z.literal("online"),
  processing_mode: z.literal("manual"),
  external_reference: z.uuid(),
  user_id: z.union([z.string(), z.number()]).transform(String),
  currency: z.string(),
  total_amount: money,
  total_paid_amount: money,
  status: z.enum([
    "created",
    "processed",
    "processing",
    "action_required",
    "failed",
    "canceled",
    "expired",
    "refunded",
    "charged_back",
    "in_mediation",
  ]),
  status_detail: z.string(),
  last_updated_date: z
    .string()
    .refine((date) => Number.isFinite(Date.parse(date))),
  transactions: z
    .object({
      refunds: z.array(z.object({ status: z.string() })).optional(),
      chargebacks: z.array(z.object({ status: z.string() })).optional(),
    })
    .optional(),
});
export type ProviderOrder = z.infer<typeof providerOrderSchema>;
// Creation and settlement are different contracts: checkout needs identity and
// an HTTPS URL; only a signed webhook plus provider lookup can approve payment.
const providerCheckoutSchema = z.object({
  id: providerOrderSchema.shape.id,
  checkout_url: z.url(),
});
const providerOrderIdentitySchema = providerOrderSchema.pick({
  id: true,
  type: true,
  processing_mode: true,
  external_reference: true,
  user_id: true,
  currency: true,
  total_amount: true,
});
function checkProviderOrder(
  p: z.infer<typeof providerOrderIdentitySchema>,
  o: Order,
  account: { id: string; live: boolean },
) {
  if (
    p.external_reference !== o.id ||
    p.user_id !== account.id ||
    p.currency !== o.currency ||
    minor(p.total_amount) !== o.amount_minor
  )
    fail(422, "La order de Mercado Pago no coincide con la orden");
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
    if (
      o.payment_environment &&
      o.payment_environment !== process.env.MERCADOPAGO_ENV
    )
      fail(409, "La orden pertenece a otro entorno de pagos");
    if (o.preference_id)
      fail(
        409,
        "Esta orden usa un checkout anterior y requiere revisión antes de reintentar",
      );
    if (o.checkout_url && o.mercadopago_order_id)
      return { url: o.checkout_url };
    const account = await providerAccount();
    const back = new URL(
      "/app/pagos",
      process.env.NEXT_PUBLIC_APP_URL!,
    ).toString();
    const response = await mp("/v1/orders", {
      method: "POST",
      headers: { "X-Idempotency-Key": o.id },
      body: JSON.stringify({
        type: "online",
        processing_mode: "manual",
        capture_mode: "automatic_async",
        total_amount: (o.amount_minor / 100).toFixed(2),
        items: [
          {
            external_code: o.plan_snapshot.id,
            title: `Pixvo Invitaciones · ${o.plan_snapshot.name}`,
            quantity: 1,
            unit_price: (o.amount_minor / 100).toFixed(2),
          },
        ],
        external_reference: o.id,
        config: {
          online: {
            success_url: back,
            failure_url: back,
            pending_url: back,
            auto_return: "approved",
            retries: { allowed: false },
          },
        },
      }),
    });
    const p = parseCheckoutResponse(
      providerCheckoutSchema,
      response,
      "create_checkout",
    );
    const url = p.checkout_url;
    if (
      typeof url !== "string" ||
      !/^https:\/\/(?:[a-z0-9-]+\.)?mercadopago\.com(?:\.ar)?\//.test(url)
    )
      fail(503, "Checkout no disponible en el entorno configurado");
    // Do not require payment timestamps/paid totals on order creation. Read back
    // the authoritative identity and commercial terms before storing the URL.
    const verified = parseCheckoutResponse(
      providerOrderIdentitySchema,
      await mp(`/v1/orders/${encodeURIComponent(p.id)}`),
      "verify_checkout",
    );
    if (verified.id !== p.id) fail(422, "Identificador de order incorrecto");
    checkProviderOrder(verified, o, account);
    await db.query(
      "update orders set mercadopago_order_id=$1,checkout_url=$2,payment_environment=$3 where id=$4",
      [p.id, url, process.env.MERCADOPAGO_ENV, o.id],
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
    o = (
      await db.query<Order>("select * from orders where id=$1 for update", [
        p.external_reference,
      ])
    ).rows[0];
  if (!o) fail(422, "Orden desconocida");
  if (o.mercadopago_order_id)
    fail(422, "Esta orden requiere una notificación de Orders API");
  if (
    String(p.collector_id) !== collector ||
    p.live_mode !== live ||
    p.currency_id !== o.currency ||
    Math.abs(p.transaction_amount * 100 - o.amount_minor) > 0.001
  )
    fail(422, "El pago no coincide con la orden");
  return settleOrder(db, o, p);
}
async function settleOrder(db: DB, o: Order, p: ProviderPayment) {
  const provider = String(p.id);
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
export async function applyProviderOrder(
  db: DB,
  input: ProviderOrder,
  account: { id: string; live: boolean },
) {
  const p = providerOrderSchema.parse(input);
  const o = (
    await db.query<Order>("select * from orders where id=$1 for update", [
      p.external_reference,
    ])
  ).rows[0];
  if (!o) fail(422, "Orden desconocida");
  checkProviderOrder(p, o, account);
  if (
    o.mercadopago_order_id !== p.id ||
    o.payment_environment !== (account.live ? "production" : "sandbox")
  )
    fail(422, "Identificador o entorno de order incorrecto");
  const chargeback =
    p.status === "charged_back" || !!p.transactions?.chargebacks?.length;
  const refund =
    p.status === "refunded" ||
    p.status_detail === "partially_refunded" ||
    p.transactions?.refunds?.some((r) => r.status === "processed");
  const approved = p.status === "processed" && p.status_detail === "accredited";
  if (
    approved &&
    !refund &&
    !chargeback &&
    minor(p.total_paid_amount) !== o.amount_minor
  )
    fail(422, "El importe acreditado no coincide con la orden");
  // One aggregate record prevents an earlier approved attempt surviving a refund.
  return settleOrder(db, o, {
    id: `mp-order:${p.id}`,
    external_reference: o.id,
    collector_id: account.id,
    live_mode: account.live,
    transaction_amount: o.amount_minor / 100,
    currency_id: o.currency,
    date_last_updated: p.last_updated_date,
    status: chargeback
      ? "charged_back"
      : refund
        ? "refunded"
        : approved
          ? "approved"
          : ["failed", "canceled", "expired"].includes(p.status)
            ? "rejected"
            : "pending",
  });
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
    !["order", "payment"].includes(body.type) ||
    String(body.data?.id).toLowerCase() !== id.toLowerCase()
  )
    fail(422, "Notificación incompatible");
  if (body.type === "order") {
    if (!/^ORD[A-Z0-9]+$/i.test(id))
      fail(422, "Identificador de order inválido");
    const account = await providerAccount();
    if (body.live_mode !== account.live || String(body.user_id) !== account.id)
      fail(422, "La notificación pertenece a otro entorno o vendedor");
    const p = providerOrderSchema.parse(
      await mp(`/v1/orders/${encodeURIComponent(id)}`),
    );
    if (p.id.toLowerCase() !== id.toLowerCase())
      fail(422, "Identificador de order incorrecto");
    return transaction((db) => applyProviderOrder(db, p, account));
  }
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
