import { transaction } from "./db";
import { fail } from "./errors";
import { owned } from "./services";
import type { User } from "./auth";
import { documentSchema, type InvitationDocument } from "../domain/document";
import { makeAzulDocument } from "../domain/azul";
import { z } from "zod";
import { randomUUID } from "node:crypto";

// Provisioning is an operator action. No public endpoint can assign ownership,
// unlock a plan, publish a draft, or change notification recipients.
export async function provisionAzul(
  ownerEmail: string,
  whatsapp: string,
  document: InvitationDocument = makeAzulDocument(),
  slug: string = "exclusive-fixture",
) {
  z.string().regex(/^[a-z0-9][a-z0-9-]{2,59}$/).parse(slug);
  const email = z.email().parse(ownerEmail.trim().toLowerCase());
  const phone = z
    .string()
    .regex(/^\+[1-9][0-9]{7,14}$/)
    .parse(whatsapp);
  return transaction(async (db) => {
    const owner = (
      await db.query<{ id: string }>(
        "select id from auth.users where lower(email)=$1",
        [email],
      )
    ).rows[0];
    if (!owner)
      fail(404, "La cuenta administradora no existe en esta base de datos");
    const prior = (
      await db.query<{ id: string; owner_id: string }>(
        "select id,owner_id from invitations where slug=$1 for update",
        [slug],
      )
    ).rows[0];
    if (prior) {
      if (prior.owner_id !== owner.id)
        fail(409, "La dirección ya está asignada a otra cuenta");
      const configured = (
        await db.query(
          "select event_id from exclusive_events where event_id=$1 and design='azul' and notification_email=$2 and notification_whatsapp=$3",
          [prior.id, email, phone],
        )
      ).rows[0];
      if (!configured)
        fail(409, "El evento existente necesita revisión; no se sobrescribió");
      return prior.id;
    }
    const id = randomUUID();
    await db.query(
      "insert into invitations(id,owner_id,slug,draft_json) values($1,$2,$3,$4)",
      [id, owner.id, slug, JSON.stringify(documentSchema.parse(document))],
    );
    await db.query(
      "insert into exclusive_events(event_id,design,notification_email,notification_whatsapp) values($1,'azul',$2,$3)",
      [id, email, phone],
    );
    return id;
  });
}
export async function exclusiveBySlug(slug: string) {
  return transaction(
    async (db) =>
      (
        await db.query<{ id: string; design: string }>(
          "select i.id,e.design from invitations i join exclusive_events e on e.event_id=i.id where i.slug=$1",
          [slug],
        )
      ).rows[0],
  );
}
export async function exclusiveDraft(user: User, slug: string) {
  return transaction(async (db) => {
    const row = (
      await db.query<{ id: string }>(
        "select i.id from invitations i join exclusive_events e on e.event_id=i.id where i.slug=$1 and e.design='azul'",
        [slug],
      )
    ).rows[0];
    if (!row) fail(404, "Invitación no encontrada");
    return owned(db, row.id, user);
  });
}
