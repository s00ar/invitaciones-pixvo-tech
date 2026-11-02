import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { transaction, asOwner } from "../src/server/db";
import { provisionAzul, exclusiveDraft } from "../src/server/exclusives";
import {
  respond,
  responses,
  getPublic,
  createInvitation,
} from "../src/server/services";
import { makeAzulDocument } from "../src/domain/azul";
import {
  dispatchNotifications,
  sendNotification,
} from "../src/server/notifications";
const owner = {
  id: randomUUID(),
  email: "exclusive-owner@example.test",
  role: "owner",
  displayName: "",
};
const other = {
  id: randomUUID(),
  email: "other@example.test",
  role: "owner",
  displayName: "",
};
let dir: string, id: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(process.cwd(), ".test-data-unit-exclusive-"));
  process.env.PIXVO_DATA_DIR = dir;
  await transaction(async (db) => {
    for (const u of [owner, other]) {
      await db.query("insert into auth.users(id,email) values($1,$2)", [
        u.id,
        u.email,
      ]);
      await db.query("insert into profiles(id) values($1)", [u.id]);
    }
  });
  id = await provisionAzul(owner.email, "+5491100000000");
});
afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await (await globalThis.pixvoDb)?.close();
  globalThis.pixvoDb = undefined;
  if (
    path.dirname(dir) !== process.cwd() ||
    !path.basename(dir).startsWith(".test-data-unit-exclusive-")
  )
    throw new Error("Unsafe cleanup");
  await rm(dir, { recursive: true, force: true });
});
it("asigna el borrador solo a la cuenta existente, sin publicar ni modificar pagos", async () => {
  expect(await provisionAzul(owner.email, "+5491100000000")).toBe(id);
  await expect(
    provisionAzul(other.email, "+5491100000000"),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    provisionAzul("missing@example.test", "+5491100000000"),
  ).rejects.toMatchObject({ status: 404 });
  const draft = await exclusiveDraft(owner, "exclusive-fixture");
  expect(draft.status).toBe("draft");
  expect(draft.entitlement).toBeNull();
  await expect(exclusiveDraft(other, "exclusive-fixture")).rejects.toMatchObject({
    status: 404,
  });
  await expect(getPublic("exclusive-fixture")).rejects.toMatchObject({ status: 404 });
});
async function fixturePublish(eventId: string, unlimited = true) {
  const d = makeAzulDocument();
  d.event.startsAt = "2099-12-05T21:00:00-03:00";
  d.event.endsAt = "2099-12-06T05:00:00-03:00";
  const rsvp = d.blocks.find((b) => b.type === "rsvp")!;
  rsvp.props.closesAt = "2099-11-11T00:00:00-03:00";
  rsvp.props.unlimitedAttendees = unlimited;
  rsvp.props.maxAttendees = 2;
  await transaction(async (db) => {
    const version = randomUUID();
    await db.query(
      "insert into invitation_versions(id,invitation_id,number,document_json) values($1,$2,1,$3)",
      [version, eventId, JSON.stringify(d)],
    );
    await db.query(
      "update invitations set status='published',published_version_id=$1,expires_at='2100-01-01' where id=$2",
      [version, eventId],
    );
  });
}
it("acepta familias de más de 20, conserva respuestas del propietario y prepara WhatsApp solo después de guardar", async () => {
  await fixturePublish(id);
  const input = {
    name: "Familia de prueba",
    response: "yes",
    attendees: 35,
    diet: "Sin gluten para una persona",
    message: "Integrantes de prueba",
  };
  const saved = await respond("exclusive-fixture", input, "test");
  expect(saved.whatsappUrl).toContain("https://wa.me/5491100000000?text=");
  expect(decodeURIComponent(saved.whatsappUrl!)).toContain("35 persona(s)");
  expect((await responses(owner, id))[0].attendees).toBe(35);
  await expect(responses(other, id)).rejects.toMatchObject({ status: 404 });
  await respond("exclusive-fixture", { ...input, token: saved.token }, "test");
  const jobs = await transaction(
    async (db) => (await db.query("select * from notification_outbox")).rows,
  );
  expect(jobs).toHaveLength(1);
  expect(jobs[0].channel).toBe("email");
  await respond(
    "exclusive-fixture",
    { ...input, attendees: 40, token: saved.token },
    "test",
  );
  expect(await responses(owner, id)).toHaveLength(1);
  expect((await responses(owner, id))[0].attendees).toBe(40);
  expect(
    await asOwner(
      other.id,
      async (db) => (await db.query("select * from notification_outbox")).rows,
    ),
  ).toHaveLength(0);
  await expect(
    respond("exclusive-fixture", { ...input, attendees: -1 }, "test"),
  ).rejects.toThrow();
  await expect(
    respond("exclusive-fixture", { ...input, attendees: 1.5 }, "test"),
  ).rejects.toThrow();
});
it("conserva los cupos en otros planes y enlaces", async () => {
  const event = (await createInvitation(owner, "pixvo-free-xv")).id;
  await fixturePublish(event, false);
  const slug = await transaction(
    async (db) =>
      (
        await db.query<{ slug: string }>(
          "select slug from invitations where id=$1",
          [event],
        )
      ).rows[0].slug,
  );
  await expect(
    respond(
      slug,
      { name: "Prueba", response: "yes", attendees: 35 },
      "bounded",
    ),
  ).rejects.toMatchObject({ status: 422 });
});
it("una integración sin configurar no finge envíos y un proveedor exitoso no significa entrega", async () => {
  vi.stubEnv("RSVP_NOTIFICATIONS_ENABLED", "false");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await dispatchNotifications()).processed).toBe(0);
  expect(fetcher).not.toHaveBeenCalled();
  const job = {
    id: randomUUID(),
    channel: "email" as const,
    notification_email: "fixture@example.test",
    payload: {
      title: "Prueba",
      name: "Fixture",
      response: "yes",
      attendees: 2,
      diet: "",
      message: "",
    },
  };
  fetcher.mockResolvedValueOnce(Response.json({ id: "test-provider-id" }));
  expect(await sendNotification(job)).toEqual({
    state: "accepted",
    providerId: "test-provider-id",
  });
  fetcher.mockRejectedValueOnce(new Error("network"));
  expect(await sendNotification(job)).toEqual({ state: "uncertain" });
  fetcher.mockResolvedValueOnce(
    Response.json({ error: "invalid" }, { status: 400 }),
  );
  expect(await sendNotification(job)).toEqual({ state: "failed" });
  vi.unstubAllGlobals();
});
