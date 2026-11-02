import { randomUUID } from "node:crypto";
import { z } from "zod";
import { transaction, type DB } from "./db";
import { owned, audit } from "./services";
import { fail } from "./errors";
import type { User } from "./auth";

const versionSchema = z.number().int().nonnegative();
async function lockNotices(db: DB, eventId: string, partyId: string) {
  const jobs = (await db.query<{state:string}>("select state from notification_outbox where event_id=$1 and rsvp_id in(select id from rsvps where event_id=$1 and guest_party_id=$2) for update", [eventId,partyId])).rows;
  if (jobs.some(j => j.state === "processing")) fail(409, "Hay un aviso en curso. Reintentá en unos segundos.");
}
const editSchema = z.object({
  expectedVersion: versionSchema,
  label: z.string().trim().min(1).max(120),
  name: z.string().trim().max(120),
  response: z.enum(["pending", "yes", "no"]),
  attendees: z.number().int().min(0).max(2147483647),
  diet: z.string().max(500),
  message: z.string().max(1000),
}).strict();

export async function editGuest(user: User, eventId: string, partyId: string, input: unknown) {
  const p = editSchema.parse(input);
  z.uuid().parse(partyId);
  return transaction(async db => {
    const i = await owned(db, eventId, user, true);
    const party = (await db.query<{max_attendees: number | null}>("select max_attendees from guest_parties where id=$1 and event_id=$2", [partyId, eventId])).rows[0];
    if (!party) fail(404, "Invitado no encontrado");
    const prior = (await db.query<{version: number}>("select version from rsvps where guest_party_id=$1 and event_id=$2", [partyId, eventId])).rows[0];
    if ((prior?.version ?? 0) !== p.expectedVersion) fail(409, "La respuesta cambió. Actualizá la lista antes de editar.");
    if (p.response === "pending" && prior) fail(422, "Elegí Asiste o No asiste para una respuesta existente");
    if (p.response === "yes" && (p.attendees < 1 || (party.max_attendees !== null && p.attendees > party.max_attendees))) fail(422, "La cantidad supera el cupo del grupo o es inválida");
    if (p.response !== "yes" && p.attendees !== 0) fail(422, "Una persona que no confirmó asistencia debe tener cantidad cero");
    if (p.response !== "pending" && !p.name) fail(422, "Completá el nombre de quien responde");
    const doc = i.published_version_id ? (await db.query<{document_json: typeof i.draft_json}>("select document_json from invitation_versions where id=$1", [i.published_version_id])).rows[0].document_json : i.draft_json;
    const capacity = doc.blocks.find(b => b.type === "rsvp" && b.enabled)?.props.capacity;
    if (capacity) {
      const used = Number((await db.query<{total:string}>("select coalesce(sum(attendees),0) as total from rsvps where event_id=$1 and guest_party_id<>$2", [eventId, partyId])).rows[0].total);
      if (used + p.attendees > capacity) fail(422, "El evento alcanzó su capacidad");
    }
    await lockNotices(db,eventId,partyId);
    await db.query("delete from notification_outbox where event_id=$1 and state in ('pending','failed') and rsvp_id in(select id from rsvps where event_id=$1 and guest_party_id=$2)", [eventId,partyId]);
    await db.query("update guest_parties set label=$1 where id=$2 and event_id=$3", [p.label, partyId, eventId]);
    if (p.response !== "pending") await db.query("insert into rsvps(id,event_id,guest_party_id,name,response,attendees,diet,message) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(event_id,guest_party_id) do update set name=$4,response=$5,attendees=$6,diet=$7,message=$8,version=rsvps.version+1,updated_at=now()", [randomUUID(), eventId, partyId, p.name, p.response, p.attendees, p.diet, p.message]);
    await audit(db, user.id, "guest.update", partyId, { eventId });
    return { message: "Invitado actualizado" };
  });
}

export async function deleteGuest(user: User, eventId: string, partyId: string, input: unknown) {
  const { expectedVersion } = z.object({expectedVersion: versionSchema}).strict().parse(input);
  z.uuid().parse(partyId);
  return transaction(async db => {
    await owned(db, eventId, user, true);
    if (!(await db.query("select id from guest_parties where id=$1 and event_id=$2", [partyId, eventId])).rows.length) fail(404, "Invitado no encontrado");
    const prior = (await db.query<{version:number}>("select version from rsvps where guest_party_id=$1 and event_id=$2", [partyId,eventId])).rows[0];
    if ((prior?.version ?? 0) !== expectedVersion) fail(409, "La respuesta cambió. Actualizá la lista antes de eliminar.");
    await lockNotices(db,eventId,partyId);
    await db.query("delete from notification_outbox where event_id=$1 and rsvp_id in(select id from rsvps where guest_party_id=$2 and event_id=$1)", [eventId,partyId]);
    await db.query("delete from rsvps where event_id=$1 and guest_party_id=$2", [eventId,partyId]);
    await db.query("delete from guest_parties where event_id=$1 and id=$2", [eventId,partyId]);
    await audit(db,user.id,"guest.delete",partyId,{eventId});
    return { message: "Invitado eliminado" };
  });
}
