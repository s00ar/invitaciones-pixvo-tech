import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  documentSchema,
  makeDocument,
  makeSampleDocument,
  referencedMedia,
  validatePlan,
  entitlementsSchema,
  type InvitationDocument,
  type Entitlements,
} from "../domain/document";
import { transaction, type DB } from "./db";
import { fail } from "./errors";
import { hashToken, token, type User } from "./auth";
import { publicProjection } from "../domain/public-projection";
import type { SampleStyle } from "../domain/custom-samples";
export type Invitation = {
  id: string;
  owner_id: string;
  slug: string;
  draft_json: InvitationDocument;
  revision: number;
  status: string;
  published_version_id: string | null;
  entitlement: Entitlements | null;
  entitlement_order_id: string | null;
  expires_at: string | null;
  republications: number;
  updated_at: string;
};
export type Plan = {
  id: string;
  name: string;
  price_minor: number | null;
  currency: string;
  entitlements: Entitlements;
  active: boolean;
};
export async function audit(
  db: DB,
  actor: string | null,
  action: string,
  entity: string,
  metadata: object = {},
) {
  await db.query(
    "insert into audit_log(id,actor_id,action,entity_id,metadata) values($1,$2,$3,$4,$5)",
    [randomUUID(), actor, action, entity, JSON.stringify(metadata)],
  );
}
export async function owned(db: DB, id: string, user: User, lock = false) {
  const i = (
    await db.query<Invitation>(
      `select * from invitations where id=$1 ${lock ? "for update" : ""}`,
      [z.uuid().parse(id)],
    )
  ).rows[0];
  if (!i || i.owner_id !== user.id) fail(404, "Invitación no encontrada");
  return i;
}
export async function listInvitations(user: User) {
  return transaction(
    async (db) =>
      (
        await db.query<Invitation>(
          "select * from invitations where owner_id=$1 order by updated_at desc",
          [user.id],
        )
      ).rows,
  );
}
export async function getInvitation(user: User, id: string) {
  return transaction((db) => owned(db, id, user));
}
export async function getPlans() {
  return transaction(
    async (db) =>
      (
        await db.query<Plan>(
          "select * from plans where active=true order by id",
        )
      ).rows,
  );
}
export async function createInvitation(
  user: User,
  templateId: string,
  copy?: InvitationDocument,
  sampleId?: SampleStyle,
) {
  if (sampleId && templateId !== "pixvo-free-xv")
    fail(422, "Las muestras personalizadas usan el template XV a tu manera");
  const doc = documentSchema.parse(
      copy ??
        (sampleId ? makeSampleDocument(sampleId) : makeDocument(templateId)),
    ),
    id = randomUUID();
  return transaction(async (db) => {
    const t = (
      await db.query("select id from templates where id=$1 and active=true", [
        templateId,
      ])
    ).rows[0];
    if (!t) fail(422, "Este template no está disponible");
    await db.query(
      "insert into invitations(id,owner_id,slug,draft_json) values($1,$2,$3,$4)",
      [id, user.id, `evento-${id.slice(0, 12)}`, JSON.stringify(doc)],
    );
    await audit(db, user.id, "invitation.create", id);
    return { id, revision: 1 };
  });
}
export async function saveDraft(
  user: User,
  id: string,
  document: unknown,
  revision: number,
  slug?: string,
) {
  const doc = documentSchema.parse(document);
  if (slug)
    z.string()
      .regex(/^[a-z0-9][a-z0-9-]{2,59}$/)
      .parse(slug);
  return transaction(async (db) => {
    const i = await owned(db, id, user, true);
    if (i.published_version_id && slug && slug !== i.slug)
      fail(409, "La URL de una invitación publicada se conserva");
    if (i.revision !== revision)
      fail(
        409,
        "Hay una versión más reciente. Recuperá o recargá antes de guardar.",
      );
    await assertMedia(db, i, doc);
    await db.query(
      "update invitations set draft_json=$1,revision=revision+1,slug=$2,updated_at=now() where id=$3",
      [JSON.stringify(doc), slug ?? i.slug, id],
    );
    return { revision: revision + 1 };
  });
}
export async function assertMedia(
  db: DB,
  i: Invitation,
  doc: InvitationDocument,
) {
  for (const mid of referencedMedia(doc)) {
    const m = (
      await db.query<{ mime: string }>(
        "select mime from media where id=$1 and event_id=$2 and owner_id=$3 and state=$4",
        [mid, i.id, i.owner_id, "ready"],
      )
    ).rows[0];
    if (!m)
      fail(422, "Un archivo no pertenece a esta invitación o no está listo");
    const image =
      doc.theme.backgroundMediaId === mid ||
      doc.theme.posterId === mid ||
      doc.blocks.some((b) => b.props.photos?.some((p) => p.mediaId === mid));
    if (
      (image && !m.mime.startsWith("image/")) ||
      (doc.theme.videoId === mid && !m.mime.startsWith("video/")) ||
      (doc.blocks.some((b) => b.props.audioId === mid) &&
        !m.mime.startsWith("audio/"))
    )
      fail(422, "El tipo del archivo no corresponde a su uso en el diseño");
  }
}
function enforcePlan(d: InvitationDocument, e: Entitlements) {
  try {
    validatePlan(d, e);
  } catch (err) {
    fail(403, (err as Error).message);
  }
}
export async function publish(user: User, id: string, revision: number) {
  return transaction(async (db) => {
    const i = await owned(db, id, user, true);
    if (i.revision !== revision)
      fail(409, "Guardá la última versión antes de publicar");
    const d = documentSchema.parse(i.draft_json);
    if (!i.entitlement || !i.entitlement_order_id)
      fail(403, "La publicación requiere un pago verificado");
    const order = (
      await db.query<{ status: string }>(
        "select status from orders where id=$1 and invitation_id=$2",
        [i.entitlement_order_id, id],
      )
    ).rows[0];
    if (order?.status !== "approved") fail(403, "El pago no está aprobado");
    enforcePlan(d, i.entitlement);
    await assertMedia(db, i, d);
    if (new Date(d.event.startsAt) <= new Date())
      fail(422, "La fecha del evento ya pasó");
    if (i.status === "archived")
      fail(422, "Reactivá el evento antes de publicar");
    if (!i.expires_at || new Date(i.expires_at) <= new Date())
      fail(403, "La vigencia del plan finalizó");
    const latest = (
      await db.query<{ number: number; document_json: InvitationDocument }>(
        "select number,document_json from invitation_versions where invitation_id=$1 order by number desc limit 1",
        [id],
      )
    ).rows[0];
    const current = i.published_version_id
      ? (
          await db.query<{ document_json: InvitationDocument }>(
            "select document_json from invitation_versions where id=$1",
            [i.published_version_id],
          )
        ).rows[0]
      : null;
    if (
      current &&
      JSON.stringify(current.document_json) === JSON.stringify(d)
    ) {
      await db.query("update invitations set status='published' where id=$1", [
        id,
      ]);
      return { slug: i.slug };
    }
    if (current && i.republications >= i.entitlement.republications)
      fail(403, "Se agotaron las republicaciones del plan");
    const version = randomUUID();
    await db.query(
      "insert into invitation_versions(id,invitation_id,number,document_json) values($1,$2,$3,$4)",
      [version, id, (latest?.number ?? 0) + 1, JSON.stringify(d)],
    );
    for (const mid of referencedMedia(d))
      await db.query(
        "insert into version_media(version_id,media_id) values($1,$2)",
        [version, mid],
      );
    await db.query(
      "update invitations set published_version_id=$1,status='published',republications=republications+$2,updated_at=now() where id=$3",
      [version, current ? 1 : 0, id],
    );
    await audit(db, user.id, "invitation.publish", id, { version });
    return { slug: i.slug };
  });
}
export async function rollback(user: User, id: string, versionId: string) {
  return transaction(async (db) => {
    const i = await owned(db, id, user, true);
    const v = (
      await db.query<{ id: string; document_json: InvitationDocument }>(
        "select id,document_json from invitation_versions where id=$1 and invitation_id=$2",
        [z.uuid().parse(versionId), id],
      )
    ).rows[0];
    if (!v) fail(404, "Versión no encontrada");
    if (!i.entitlement || !i.entitlement_order_id) fail(403, "Pago requerido");
    const o = (
      await db.query<{ status: string }>(
        "select status from orders where id=$1",
        [i.entitlement_order_id],
      )
    ).rows[0];
    if (
      o?.status !== "approved" ||
      !i.expires_at ||
      new Date(i.expires_at) <= new Date()
    )
      fail(403, "El derecho de publicación no está vigente");
    enforcePlan(v.document_json, i.entitlement);
    if (new Date(v.document_json.event.startsAt) <= new Date())
      fail(422, "El evento de esta versión ya pasó");
    await db.query(
      "update invitations set published_version_id=$1,status='published',updated_at=now() where id=$2",
      [v.id, id],
    );
    await audit(db, user.id, "invitation.rollback", id, { versionId });
    return { slug: i.slug };
  });
}
export async function setStatus(user: User, id: string, status: string) {
  z.enum(["draft", "paused", "archived"]).parse(status);
  return transaction(async (db) => {
    await owned(db, id, user, true);
    await db.query(
      "update invitations set status=$1,updated_at=now() where id=$2",
      [status, id],
    );
    await audit(db, user.id, "invitation.status", id, { status });
  });
}
export async function publicInvitation(db: DB, slug: string, lock = false) {
  const i = (
    await db.query<Invitation>(
      `select * from invitations where slug=$1 ${lock ? "for update" : ""}`,
      [slug],
    )
  ).rows[0];
  if (
    !i ||
    i.status !== "published" ||
    !i.published_version_id ||
    !i.expires_at ||
    new Date(i.expires_at) <= new Date()
  )
    fail(404, "Esta invitación no está disponible");
  const row = (
    await db.query<{ document_json: InvitationDocument }>(
      "select document_json from invitation_versions where id=$1 and invitation_id=$2",
      [i.published_version_id, i.id],
    )
  ).rows[0];
  const doc = documentSchema.parse(row.document_json);
  if (doc.event.endsAt && new Date(doc.event.endsAt) <= new Date())
    fail(404, "Este evento finalizó");
  return { i, document: publicProjection(doc) };
}
export async function getPublic(slug: string) {
  return transaction(async (db) => {
    const { document } = await publicInvitation(db, slug);
    return document;
  });
}
export async function rateLimit(db: DB, key: string, max = 12, seconds = 60) {
  const r = (
    await db.query<{ hits: number }>(
      `insert into rate_limits(key,hits,window_at) values($1,1,now()) on conflict(key) do update set hits=case when rate_limits.window_at < now()-($2 * interval '1 second') then 1 else rate_limits.hits+1 end,window_at=case when rate_limits.window_at<now()-($2 * interval '1 second') then now() else rate_limits.window_at end returning hits`,
      [key, seconds],
    )
  ).rows[0];
  if (r.hits > max) fail(429, "Demasiados intentos. Esperá un momento.");
}
export const rsvpSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    response: z.enum(["yes", "no"]),
    attendees: z.number().int().min(0).max(20),
    diet: z.string().max(500).default(""),
    message: z.string().max(1000).default(""),
    token: z.string().max(100).optional(),
    website: z.string().max(100).default(""),
  })
  .strict();
export async function respond(slug: string, input: unknown, ip: string) {
  const p = rsvpSchema.parse(input);
  if (p.website) fail(422, "Solicitud inválida");
  // Rate limit commits independently, including failed submissions.
  await transaction((db) => rateLimit(db, `rsvp:${slug}:${hashToken(ip)}`, 12));
  return transaction(async (db) => {
    const { i, document: d } = await publicInvitation(db, slug, true);
    const config = d.blocks.find((b) => b.type === "rsvp" && b.enabled)?.props;
    if (!config) fail(422, "Confirmaciones cerradas");
    if (config.closesAt && new Date(config.closesAt) < new Date())
      fail(422, "El plazo de confirmación finalizó");
    let party = p.token
      ? (
          await db.query<{ id: string; max_attendees: number }>(
            "select id,max_attendees from guest_parties where event_id=$1 and token_hash=$2",
            [i.id, hashToken(p.token)],
          )
        ).rows[0]
      : null;
    if (p.token && !party) fail(403, "El enlace de invitado es inválido");
    if (!party && config.mode === "guest")
      fail(403, "Usá tu enlace personal para responder");
    const max = party?.max_attendees ?? config.maxAttendees ?? 2;
    if (
      (p.response === "yes" && (p.attendees < 1 || p.attendees > max)) ||
      (p.response === "no" && p.attendees !== 0)
    )
      fail(422, `Cantidad inválida. El máximo es ${max}`);
    if (config.capacity) {
      const used = Number(
        (
          await db.query<{ total: string }>(
            "select coalesce(sum(attendees),0) as total from rsvps where event_id=$1 and ($2::uuid is null or guest_party_id<>$2)",
            [i.id, party?.id ?? null],
          )
        ).rows[0].total,
      );
      if (used + p.attendees > config.capacity)
        fail(422, "El evento alcanzó su capacidad");
    }
    let receipt = p.token;
    if (!party) {
      receipt = token();
      party = { id: randomUUID(), max_attendees: max };
      await db.query(
        "insert into guest_parties(id,event_id,token_hash,max_attendees,label) values($1,$2,$3,$4,$5)",
        [party.id, i.id, hashToken(receipt!), max, p.name],
      );
    }
    await db.query(
      "insert into rsvps(id,event_id,guest_party_id,name,response,attendees,diet,message) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(event_id,guest_party_id) do update set name=$4,response=$5,attendees=$6,diet=$7,message=$8,version=rsvps.version+1,updated_at=now()",
      [
        randomUUID(),
        i.id,
        party.id,
        p.name,
        p.response,
        p.attendees,
        config.askDiet ? p.diet : "",
        p.message,
      ],
    );
    return {
      token: receipt,
      message:
        "Tu respuesta quedó guardada. Podés actualizarla desde este dispositivo.",
    };
  });
}
export async function createGuest(
  user: User,
  id: string,
  label: string,
  max: number,
) {
  z.string().min(1).max(120).parse(label);
  z.number().int().min(1).max(20).parse(max);
  const receipt = token();
  return transaction(async (db) => {
    const i = await owned(db, id, user, true);
    await db.query(
      "insert into guest_parties(id,event_id,token_hash,max_attendees,label) values($1,$2,$3,$4,$5)",
      [randomUUID(), id, hashToken(receipt), max, label],
    );
    return { slug: i.slug, token: receipt };
  });
}
export async function responses(user: User, id: string) {
  return transaction(async (db) => {
    await owned(db, id, user);
    return (
      await db.query<{
        id: string;
        label: string;
        name: string | null;
        response: string | null;
        attendees: number | null;
        diet: string | null;
        message: string | null;
        max_attendees: number;
      }>(
        "select g.id,g.label,g.max_attendees,r.name,r.response,r.attendees,r.diet,r.message from guest_parties g left join rsvps r on r.guest_party_id=g.id where g.event_id=$1 order by g.created_at desc",
        [id],
      )
    ).rows;
  });
}
export async function songs(slug: string, input: unknown, ip: string) {
  const p = z
    .object({
      title: z.string().min(1).max(120),
      artist: z.string().max(120),
      url: z
        .string()
        .max(1000)
        .refine((s) => !s || s.startsWith("https://")),
      website: z.string().max(100).default(""),
    })
    .strict()
    .parse(input);
  if (p.website) fail(422, "Solicitud inválida");
  await transaction((db) => rateLimit(db, `songs:${slug}:${hashToken(ip)}`, 5));
  return transaction(async (db) => {
    const { i, document } = await publicInvitation(db, slug, true);
    if (!document.blocks.some((b) => b.enabled && b.type === "songRequests"))
      fail(422, "Sugerencias deshabilitadas");
    await db.query(
      "insert into song_requests(id,event_id,title,artist,url) values($1,$2,$3,$4,$5)",
      [randomUUID(), i.id, p.title, p.artist, p.url],
    );
    return { message: "Sugerencia guardada" };
  });
}
export async function configurePlan(user: User, input: unknown) {
  if (user.role !== "admin") fail(403, "Acceso reservado a administración");
  const p = z
    .object({
      id: z.enum(["standard", "premium", "custom"]),
      name: z.string().min(1).max(80),
      price_minor: z.number().int().positive().max(100000000).nullable(),
      entitlements: entitlementsSchema,
      active: z.boolean(),
    })
    .strict()
    .parse(input);
  if (p.id !== p.entitlements.tier)
    fail(422, "El nivel del plan debe coincidir con su identificador");
  return transaction(async (db) => {
    await db.query(
      "update plans set name=$1,price_minor=$2,entitlements=$3,active=$4 where id=$5",
      [p.name, p.price_minor, JSON.stringify(p.entitlements), p.active, p.id],
    );
    await audit(db, user.id, "plan.update", p.id);
  });
}
