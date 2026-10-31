import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID, createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { transaction, asOwner } from "../src/server/db";
import {
  makeDocument,
  templates,
  documentSchema,
  changeTemplate,
  validatePlan,
  defaultPlans,
  referencedMedia,
  makeSampleDocument,
  applySample,
} from "../src/domain/document";
import { csv, calendarICS } from "../src/domain/format";
import {
  applyPayment,
  verifySignature,
  createOrder,
  checkout,
  webhook,
  type ProviderPayment,
} from "../src/server/payments";
import {
  createInvitation,
  saveDraft,
  getInvitation,
  publish,
  getPublic,
  respond,
  responses,
  createGuest,
  rollback,
  setStatus,
  configurePlan,
  type Invitation,
} from "../src/server/services";
import { upload, getMedia, duplicate } from "../src/server/media";
import type { User } from "../src/server/auth";
import sharp from "sharp";
import { publicProjection } from "../src/domain/public-projection";
import { customSamples } from "../src/domain/custom-samples";
const a: User = {
    id: randomUUID(),
    email: "owner-a@example.test",
    role: "owner",
    displayName: "",
  },
  b: User = {
    id: randomUUID(),
    email: "owner-b@example.test",
    role: "owner",
    displayName: "",
  };
let temp: string, event: string, other: string;
beforeAll(async () => {
  temp = await mkdtemp(path.join(process.cwd(), ".test-data-unit-"));
  process.env.PIXVO_DATA_DIR = temp;
  await transaction(async (db) => {
    for (const u of [a, b]) {
      await db.query("insert into auth.users(id,email) values($1,$2)", [
        u.id,
        u.email,
      ]);
      await db.query("insert into profiles(id) values($1)", [u.id]);
    }
  });
  event = (await createInvitation(a, "pixvo-glam-pink")).id;
  other = (await createInvitation(b, "pixvo-editorial-minimal")).id;
});
afterAll(async () => {
  await (await globalThis.pixvoDb)?.close();
  globalThis.pixvoDb = undefined;
  const relative = path.relative(process.cwd(), temp);
  if (
    path.isAbsolute(relative) ||
    relative.startsWith("..") ||
    !path.basename(temp).startsWith(".test-data-unit-")
  )
    throw new Error("Unexpected test cleanup path");
  await rm(temp, { recursive: true, force: true });
});
async function paid(id: string, user = a) {
  const o = randomUUID();
  await transaction((db) =>
    db.query(
      "insert into orders(id,owner_id,invitation_id,plan_snapshot,amount_minor,currency) values($1,$2,$3,$4,123450,$5)",
      [
        o,
        user.id,
        id,
        JSON.stringify({
          ...defaultPlans[1],
          price_minor: 123450,
          currency: "ARS",
        }),
        "ARS",
      ],
    ),
  );
  const p: ProviderPayment = {
    id: randomUUID(),
    external_reference: o,
    collector_id: "test-merchant",
    transaction_amount: 1234.5,
    currency_id: "ARS",
    status: "approved",
    live_mode: false,
    date_last_updated: new Date().toISOString(),
  };
  return { o, p };
}
async function update(id: string, edit: (d: Invitation["draft_json"]) => void) {
  const i = await getInvitation(a, id);
  edit(i.draft_json);
  return saveDraft(a, id, i.draft_json, i.revision);
}
describe("documento y exportación", () => {
  it("elimina datos de bloques desactivados y propiedades ajenas del público", () => {
    const d = makeDocument("pixvo-glam-pink");
    d.blocks.find((b) => b.type === "gifts")!.props.alias =
      "alias-privado-desactivado";
    d.blocks.find((b) => b.type === "hero")!.props.alias =
      "dato-no-renderizado";
    const projection = JSON.stringify(publicProjection(d));
    expect(projection).not.toContain("alias-privado");
    expect(projection).not.toContain("dato-no-renderizado");
    expect(d.blocks.find((b) => b.type === "gifts")!.props.alias).toBe(
      "alias-privado-desactivado",
    );
  });
  it("valida los 27 presets y cinco familias sin metadata del competidor", () => {
    expect(templates).toHaveLength(27);
    expect(new Set(templates.map((t) => t.family)).size).toBe(5);
    for (const t of templates)
      expect(documentSchema.safeParse(makeDocument(t.id)).success).toBe(true);
    expect(JSON.stringify(templates)).not.toContain("somosweb");
  });
  it("conserva contenido y referencias al cambiar template", () => {
    const d = makeDocument("pixvo-glam-pink");
    d.event.title = "Emilia";
    d.theme.backgroundMediaId = randomUUID();
    d.blocks.find((b) => b.type === "gallery")!.props.photos = [
      { mediaId: randomUUID(), alt: "Recuerdo" },
    ];
    const n = changeTemplate(d, "pixvo-editorial-minimal");
    expect(n.event).toEqual(d.event);
    expect(n.blocks).toEqual(d.blocks);
    expect(referencedMedia(n)).toEqual(referencedMedia(d));
  });
  it("rechaza código, URL insegura, zona y bloques obligatorios inválidos", () => {
    const d = makeDocument("pixvo-glam-pink");
    expect(documentSchema.safeParse({ ...d, html: "<script>" }).success).toBe(
      false,
    );
    d.blocks[0].props.url = "javascript:alert(1)";
    expect(documentSchema.safeParse(d).success).toBe(false);
    d.blocks[0].props.url = "https://example.test";
    d.event.timezone = "no/existe";
    expect(documentSchema.safeParse(d).success).toBe(false);
    d.event.timezone = "UTC";
    d.blocks[0].enabled = false;
    expect(documentSchema.safeParse(d).success).toBe(false);
  });
  it("neutraliza fórmulas, comillas y saltos CSV", () => {
    const out = csv([["=CMD()", " +123", "-2", "@sum", 'ok"texto', "a\nb"]]);
    expect(out).toBe(
      '\uFEFF"\'=CMD()","\' +123","\'-2","\'@sum","ok""texto","a b"',
    );
  });
  it("genera ICS UTC con escape y fin posterior, incluso cambio horario", () => {
    const d = makeDocument("pixvo-glam-pink");
    d.event.startsAt = "2027-10-31T01:30:00+02:00";
    d.event.timezone = "Europe/Rome";
    d.event.title = "Fiesta, sí;\nCon vos";
    const ics = calendarICS(d, "event");
    expect(ics).toContain("DTSTART:20271030T233000Z");
    expect(ics).toContain("DTEND:20271031T013000Z");
    expect(ics).toContain("SUMMARY:Fiesta\\, sí\\;\\nCon vos");
    for (const line of ics.split("\r\n"))
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});
describe("permisos, persistencia y revisiones", () => {
  it("aísla lectura y edición por propietario en servicios", async () => {
    await expect(getInvitation(b, event)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      saveDraft(b, event, makeDocument("pixvo-glam-pink"), 1),
    ).rejects.toMatchObject({ status: 404 });
    await expect(responses(b, event)).rejects.toMatchObject({ status: 404 });
  });
  it("aísla RLS directamente y deniega escrituras Data API", async () => {
    const own = await asOwner(
      a.id,
      async (db) =>
        (await db.query<{ id: string }>("select id from invitations")).rows,
    );
    expect(own.map((i) => i.id)).toEqual([event]);
    for (const table of [
      "media",
      "rsvps",
      "orders",
      "guest_parties",
      "invitation_versions",
      "payments",
      "custom_requests",
    ])
      expect(
        (await asOwner(a.id, (db) => db.query(`select * from ${table}`))).rows,
      ).toHaveLength(0);
    await expect(
      asOwner(a.id, (db) =>
        db.query("update profiles set role='admin' where id=$1", [a.id]),
      ),
    ).rejects.toThrow();
    await expect(
      asOwner(a.id, (db) =>
        db.query("delete from invitations where id=$1", [other]),
      ),
    ).rejects.toThrow();
  });
  it("persiste cambios y rechaza revisiones concurrentes", async () => {
    const i = await getInvitation(a, event);
    i.draft_json.event.title = "XV persistido";
    const results = await Promise.allSettled([
      saveDraft(a, event, i.draft_json, i.revision),
      saveDraft(a, event, i.draft_json, i.revision),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason.status,
    ).toBe(409);
    expect((await getInvitation(a, event)).draft_json.event.title).toBe(
      "XV persistido",
    );
  });
  it("no expone borrador y no publica sin pago ni configuración", async () => {
    const i = await getInvitation(a, event);
    await expect(getPublic(i.slug)).rejects.toMatchObject({ status: 404 });
    await expect(publish(a, event, i.revision)).rejects.toMatchObject({
      status: 403,
    });
    await expect(createOrder(a, event, "premium")).rejects.toMatchObject({
      status: 503,
    });
  });
  it("reserva configuración de planes a administración", async () => {
    await expect(configurePlan(a, {})).rejects.toMatchObject({ status: 403 });
  });
});
describe("pagos verificados e idempotencia", () => {
  it("ejecuta el contrato HTTP de checkout y webhook con proveedor stub aislado", async () => {
    const fresh = (await createInvitation(a, "pixvo-glam-pink")).id;
    for (const [key, value] of Object.entries({
      PAYMENTS_ENABLED: "true",
      MERCADOPAGO_ACCESS_TOKEN: "test-only-token",
      MERCADOPAGO_WEBHOOK_SECRET: "test-only-secret",
      MERCADOPAGO_COLLECTOR_ID: "test-merchant",
      NEXT_PUBLIC_APP_URL: "https://example.test",
      MERCADOPAGO_ENV: "sandbox",
    }))
      vi.stubEnv(key, value);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    try {
      await transaction((db) =>
        db.query("update plans set price_minor=123450 where id='premium'"),
      );
      const order = await createOrder(a, fresh, "premium");
      expect((await createOrder(a, fresh, "premium")).id).toBe(order.id);
      fetchMock.mockResolvedValueOnce(
        Response.json({
          id: "test-preference",
          sandbox_init_point:
            "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test",
        }),
      );
      const c = await checkout(a, order.id);
      expect((await checkout(a, order.id)).url).toBe(c.url);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const args = fetchMock.mock.calls[0];
      expect(args[0]).toBe("https://api.mercadopago.com/checkout/preferences");
      const body = JSON.parse(String(args[1]?.body));
      expect(body.external_reference).toBe(order.id);
      expect(body.items[0].unit_price).toBe(1234.5);
      const ts = String(Math.floor(Date.now() / 1000)),
        rid = "stub-request",
        id = "12345",
        sig = createHmac("sha256", "test-only-secret")
          .update(`id:${id};request-id:${rid};ts:${ts};`)
          .digest("hex");
      const request = (signature: string) =>
        new Request(
          `https://example.test/api/webhooks/mercadopago?data.id=${id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-signature": signature,
              "x-request-id": rid,
            },
            body: JSON.stringify({ type: "payment", data: { id } }),
          },
        );
      await expect(webhook(request("invalid"))).rejects.toMatchObject({
        status: 401,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const p = {
        id,
        external_reference: order.id,
        collector_id: "test-merchant",
        transaction_amount: 1234.5,
        currency_id: "ARS",
        status: "approved",
        live_mode: false,
        date_last_updated: new Date().toISOString(),
      };
      fetchMock.mockResolvedValueOnce(Response.json(p));
      await webhook(request(`ts=${ts},v1=${sig}`));
      expect((await getInvitation(a, fresh)).entitlement_order_id).toBe(
        order.id,
      );
    } finally {
      fetchMock.mockRestore();
      vi.unstubAllEnvs();
    }
  });
  it("verifica HMAC, datos firmados y ventana de replay", () => {
    const ts = String(Math.floor(Date.now() / 1000)),
      secret = "test-only-secret",
      rid = "test-request",
      id = "12345";
    const v = createHmac("sha256", secret)
      .update(`id:${id};request-id:${rid};ts:${ts};`)
      .digest("hex");
    expect(verifySignature(id, rid, `ts=${ts},v1=${v}`, secret)).toBe(true);
    expect(verifySignature("56789", rid, `ts=${ts},v1=${v}`, secret)).toBe(
      false,
    );
    expect(
      verifySignature(id, rid, `ts=${ts},v1=${v}`, secret, Date.now() + 600000),
    ).toBe(false);
  });
  it("rechaza orden, comercio, modo, importe y moneda ajenos", async () => {
    const { p } = await paid(event);
    for (const bad of [
      { external_reference: randomUUID() },
      { collector_id: "other" },
      { currency_id: "USD" },
      { transaction_amount: 1 },
      { live_mode: true },
    ])
      await expect(
        transaction((db) =>
          applyPayment(db, { ...p, ...bad }, "test-merchant", false),
        ),
      ).rejects.toMatchObject({ status: 422 });
  });
  it("procesa duplicados concurrentes una vez y no reinicia cupos", async () => {
    const { p, o } = await paid(event);
    const result = await Promise.all([
      transaction((db) => applyPayment(db, p, "test-merchant", false)),
      transaction((db) => applyPayment(db, p, "test-merchant", false)),
    ]);
    expect(result.filter((r) => "duplicate" in r)).toHaveLength(1);
    const i = await getInvitation(a, event);
    expect(i.entitlement_order_id).toBe(o);
    const audit = await transaction((db) =>
      db.query(
        "select * from audit_log where action='payment.entitlement' and entity_id=$1",
        [o],
      ),
    );
    expect(audit.rows).toHaveLength(1);
  });
});
describe("publicación, archivos y RSVP", () => {
  it("crea, edita y publica cada uno de los 27 presets", async () => {
    for (const t of templates) {
      const fresh = (await createInvitation(a, t.id)).id;
      await update(fresh, (d) => {
        d.event.title = `Prueba ${t.name}`;
      });
      const { p } = await paid(fresh);
      await transaction((db) => applyPayment(db, p, "test-merchant", false));
      const i = await getInvitation(a, fresh);
      const { slug } = await publish(a, fresh, i.revision);
      expect((await getPublic(slug)).templateId).toBe(t.id);
    }
  });
  it("valida bytes, quita EXIF, autoriza archivos y rechaza SVG/disfrazados", async () => {
    await expect(
      upload(
        a,
        event,
        new File(["<svg/>"], "fake.png", { type: "image/png" }),
        true,
      ),
    ).rejects.toMatchObject({ status: 422 });
    const bytes = await sharp({
      create: { width: 100, height: 100, channels: 3, background: "#937aff" },
    })
      .jpeg()
      .toBuffer();
    const m = await upload(
      a,
      event,
      new File([bytes], "foto.jpg", { type: "image/jpeg" }),
      true,
    );
    expect(m.mime).toBe("image/webp");
    await expect(getMedia(m.id, b)).rejects.toMatchObject({ status: 404 });
    await expect(
      upload(b, event, new File([bytes], "foto.jpg"), true),
    ).rejects.toMatchObject({ status: 404 });
    await update(event, (d) => {
      d.blocks.find((b) => b.type === "gallery")!.enabled = true;
      d.blocks.find((b) => b.type === "gallery")!.props.photos = [
        { mediaId: m.id, alt: "Prueba propia" },
      ];
    });
  });
  it("publica snapshot saneado y preserva borrador separado", async () => {
    const i = await getInvitation(a, event);
    const { slug } = await publish(a, event, i.revision);
    const publicDoc = await getPublic(slug);
    expect(publicDoc.event.title).toBe("XV persistido");
    expect(JSON.stringify(publicDoc)).not.toContain(a.id);
    await update(event, (d) => {
      d.event.title = "Cambio sin publicar";
    });
    expect((await getPublic(slug)).event.title).toBe("XV persistido");
    const mid = referencedMedia(publicDoc)[0];
    expect((await getMedia(mid, null, slug)).mime).toBe("image/webp");
  });
  it("persiste sí/no y token actualiza una sola respuesta; valida cupos", async () => {
    const i = await getInvitation(a, event);
    await expect(
      respond(
        i.slug,
        { name: "Exceso", response: "yes", attendees: 3 },
        "test1",
      ),
    ).rejects.toMatchObject({ status: 422 });
    const r = await respond(
      i.slug,
      { name: "=Prueba", response: "yes", attendees: 2, diet: "Sin gluten" },
      "test1",
    );
    await respond(
      i.slug,
      { name: "=Prueba", response: "no", attendees: 0, token: r.token },
      "test1",
    );
    expect(await responses(a, event)).toHaveLength(1);
    expect((await responses(a, event))[0].response).toBe("no");
    await expect(
      respond(
        i.slug,
        { name: "Ajeno", response: "yes", attendees: 1, token: "invalid" },
        "test2",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("duplica contenido y medios, sin pagos ni invitados", async () => {
    const dup = await duplicate(a, event),
      i = await getInvitation(a, dup.id);
    expect(i.entitlement).toBeNull();
    expect(i.published_version_id).toBeNull();
    expect(await responses(a, i.id)).toHaveLength(0);
    expect(referencedMedia(i.draft_json)).toHaveLength(1);
    expect(referencedMedia(i.draft_json)[0]).not.toBe(
      referencedMedia((await getInvitation(a, event)).draft_json)[0],
    );
  });
  it("cuenta republicaciones atómicas y rollback no pierde RSVP", async () => {
    let i = await getInvitation(a, event);
    const first = i.published_version_id;
    for (let n = 0; n < 3; n++) {
      await update(event, (d) => {
        d.event.title = `Publicación ${n}`;
      });
      i = await getInvitation(a, event);
      await publish(a, event, i.revision);
    }
    expect((await getInvitation(a, event)).republications).toBe(3);
    await update(event, (d) => {
      d.event.title = "Cuarta";
    });
    i = await getInvitation(a, event);
    await expect(publish(a, event, i.revision)).rejects.toMatchObject({
      status: 403,
    });
    await rollback(a, event, first!);
    expect((await getPublic(i.slug)).event.title).toBe("XV persistido");
    expect(await responses(a, event)).toHaveLength(1);
  });
  it("enlaces privados y capacidad se verifican bajo bloqueo", async () => {
    const fresh = (await createInvitation(a, "pixvo-glam-pink")).id;
    await update(fresh, (d) => {
      const r = d.blocks.find((b) => b.type === "rsvp")!;
      r.props.mode = "guest";
      r.props.capacity = 2;
    });
    const { p } = await paid(fresh);
    await transaction((db) => applyPayment(db, p, "test-merchant", false));
    let i = await getInvitation(a, fresh);
    await publish(a, fresh, i.revision);
    await expect(
      respond(
        i.slug,
        { name: "Sin enlace", response: "yes", attendees: 1 },
        "guest1",
      ),
    ).rejects.toMatchObject({ status: 403 });
    const g1 = await createGuest(a, fresh, "Grupo 1", 2),
      g2 = await createGuest(a, fresh, "Grupo 2", 2);
    const results = await Promise.allSettled([
      respond(
        i.slug,
        { name: "Uno", response: "yes", attendees: 2, token: g1.token },
        "guest1",
      ),
      respond(
        i.slug,
        { name: "Dos", response: "yes", attendees: 2, token: g2.token },
        "guest2",
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
        .reason.status,
    ).toBe(422);
    await setStatus(a, fresh, "paused");
    await expect(getPublic(i.slug)).rejects.toMatchObject({ status: 404 });
    await expect(
      respond(
        i.slug,
        { name: "Uno", response: "no", attendees: 0, token: g1.token },
        "guest1",
      ),
    ).rejects.toMatchObject({ status: 404 });
    i = await getInvitation(a, fresh);
    expect(i.status).toBe("paused");
  });
  it("aplica restricciones del plan en servidor", () => {
    const d = makeDocument("pixvo-neon-party");
    expect(() =>
      validatePlan(d, defaultPlans[0].entitlements as never),
    ).toThrow("Premium");
  });
});

describe("muestras XV personalizadas", () => {
  it("valida cinco estilos y conserva el catálogo original y los documentos previos", () => {
    expect(customSamples).toHaveLength(5);
    expect(templates).toHaveLength(27);
    for (const s of customSamples) {
      const d = makeSampleDocument(s.id);
      expect(documentSchema.safeParse(d).success).toBe(true);
      expect(d.theme.sampleStyle).toBe(s.id);
      expect(d.theme.background).toBe(s.background);
      expect(d.templateId).toBe("pixvo-free-xv");
    }
    const old = makeDocument("pixvo-glam-pink");
    expect(old.theme.sampleStyle).toBeUndefined();
    expect(
      documentSchema.safeParse({
        ...old,
        theme: { ...old.theme, sampleStyle: "<script>" },
      }).success,
    ).toBe(false);
  });
  it("cambia estilos conservando datos, bloques y referencias de archivos", () => {
    const old = makeDocument("pixvo-free-xv");
    old.event.title = "Nombre propio";
    old.theme.backgroundMediaId = randomUUID();
    old.blocks.find((b) => b.type === "gallery")!.props.photos = [
      { mediaId: randomUUID(), alt: "Recuerdo" },
    ];
    const changed = applySample(old, "envelope");
    expect(changed.event).toEqual(old.event);
    expect(changed.blocks).toEqual(old.blocks);
    expect(referencedMedia(changed)).toEqual(referencedMedia(old));
    expect(old.theme.sampleStyle).toBeUndefined();
  });
  it("persiste y publica las cinco muestras con RSVP real y el mismo documento", async () => {
    for (const s of customSamples) {
      const fresh = (
        await createInvitation(a, "pixvo-free-xv", undefined, s.id)
      ).id;
      const saved = await getInvitation(a, fresh);
      expect(saved.draft_json.theme.sampleStyle).toBe(s.id);
      const { p } = await paid(fresh);
      await transaction((db) => applyPayment(db, p, "test-merchant", false));
      const { slug } = await publish(a, fresh, saved.revision);
      expect((await getPublic(slug)).theme.sampleStyle).toBe(s.id);
      await respond(
        slug,
        { name: "Invitada de muestra", response: "yes", attendees: 1 },
        `sample-${s.id}`,
      );
      expect((await responses(a, fresh))[0].response).toBe("yes");
    }
  });
});
