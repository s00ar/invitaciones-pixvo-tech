// This fixture runner is test-only; no payment bypass is shipped in app routes.
import { randomUUID, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { transaction } from "../../src/server/db";
import { makeDocument, defaultPlans } from "../../src/domain/document";
import { applyPayment } from "../../src/server/payments";
import { publish } from "../../src/server/services";
process.env.PIXVO_LOCAL_DEV = "1";
process.env.PIXVO_DATA_DIR = path.join(
  process.cwd(),
  ".test-data",
  `e2e-${Date.now()}`,
);
// Exercise deployments where the configured site URL has a trailing slash.
process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3001/";
await mkdir(process.env.PIXVO_DATA_DIR, { recursive: true });
const owner = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.test",
  role: "owner",
  displayName: "Organizador de prueba",
};
await transaction(async (db) => {
  for (const [id, email, role] of [
    [owner.id, owner.email, "owner"],
    ["22222222-2222-4222-8222-222222222222", "other@example.test", "owner"],
    ["33333333-3333-4333-8333-333333333333", "admin@example.test", "admin"],
  ]) {
    const salt = "test-fixture-only";
    await db.query("insert into auth.users(id,email) values($1,$2)", [
      id,
      email,
    ]);
    await db.query(
      "insert into local_dev.users(id,email,password_hash) values($1,$2,$3)",
      [
        id,
        email,
        `${salt}:${scryptSync("FixturePass2027!", salt, 64).toString("hex")}`,
      ],
    );
    await db.query(
      "insert into profiles(id,display_name,role) values($1,$2,$3)",
      [id, "Cuenta ficticia", role],
    );
  }
  for (const [id, slug] of [
    ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "e2e-celebracion"],
    ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "e2e-publica"],
    ["dddddddd-dddd-4ddd-8ddd-dddddddddddd", "e2e-video"],
  ]) {
    const doc = makeDocument(
      slug === "e2e-video" ? "pixvo-disco-night" : "pixvo-glam-pink",
    );
    doc.event.title = "Celebración de prueba";
    doc.blocks.find((b) => b.type === "calendar")!.enabled = true;
    doc.blocks.find((b) => b.type === "venues")!.props.items = [
      {
        name: "Salón de prueba",
        address: "Dirección ficticia",
        url: "https://maps.google.com/",
      },
    ];
    await db.query(
      "insert into invitations(id,owner_id,slug,draft_json) values($1,$2,$3,$4)",
      [id, owner.id, slug, JSON.stringify(doc)],
    );
    const order = randomUUID();
    await db.query(
      "insert into orders(id,owner_id,invitation_id,plan_snapshot,amount_minor,currency) values($1,$2,$3,$4,123450,$5)",
      [
        order,
        owner.id,
        id,
        JSON.stringify({
          ...defaultPlans[1],
          price_minor: 123450,
          currency: "ARS",
        }),
        "ARS",
      ],
    );
    await applyPayment(
      db,
      {
        id: randomUUID(),
        external_reference: order,
        collector_id: "test-merchant",
        transaction_amount: 1234.5,
        currency_id: "ARS",
        status: "approved",
        live_mode: false,
        date_last_updated: new Date().toISOString(),
      },
      "test-merchant",
      false,
    );
  }
});
await publish(owner, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", 1);
await (await globalThis.pixvoDb)?.close();
globalThis.pixvoDb = undefined;
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  { stdio: "inherit", env: process.env },
);
child.on("exit", (code) => process.exit(code ?? 1));
