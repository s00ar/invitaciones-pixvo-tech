import { test, expect, type Page } from "./fixtures";
import sharp from "sharp";
import type { Route } from "@playwright/test";

async function draft(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("FixturePass2027!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const response = await page.request.post("/api/invitations", {
    data: { templateId: "pixvo-free-xv" },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id as string;
}

test("editor espera a estar listo antes de aceptar la primera edición", async ({
  page,
}) => {
  const id = await draft(page);
  const pending: Route[] = [];
  let released = false;
  await page.route("**/_next/static/chunks/**", (route) => {
    if (released) return route.continue();
    pending.push(route);
  });
  await page.goto(`/app/invitaciones/${id}/editar`, { waitUntil: "commit" });
  const name = page.getByLabel("Nombre del evento", { exact: true });
  await expect(name).toBeDisabled();
  released = true;
  await Promise.all(pending.map((route) => route.continue()));
  await expect(name).toBeEnabled();
  await name.fill("Primera edición conservada");
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  const stored = await (
    await page.request.get(`/api/invitations/${id}`)
  ).json();
  expect(stored.draft_json.event.title).toBe("Primera edición conservada");
});

test("cuenta regresiva cabe en canvas móvil con navegador desktop", async ({
  page,
}) => {
  const id = await draft(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/app/invitaciones/${id}/editar`);
  await page.getByRole("button", { name: "Vista móvil", exact: true }).click();
  await page
    .getByRole("button", { name: "Estilo y diseño", exact: true })
    .click();
  for (const family of [
    "party",
    "editorial",
    "ornamental",
    "kids",
    "corporate",
  ]) {
    await page
      .getByRole("combobox", { name: /^Composición/ })
      .selectOption(family);
    const bounds = await page
      .locator(".canvas-frame .countdown")
      .evaluate((el) => {
        const frame = el.closest(".canvas-frame")!.getBoundingClientRect();
        return Array.from(el.querySelectorAll("strong,span")).map((node) => {
          const r = node.getBoundingClientRect();
          return (
            r.left >= frame.left - 1 &&
            r.right <= frame.right + 1 &&
            node.scrollWidth <= node.clientWidth + 1
          );
        });
      });
    expect(bounds, family).toEqual(Array(8).fill(true));
    if (family === "party")
      await page
        .locator(".count-section")
        .screenshot({ path: "test-results/evidence/contador-mobile.png" });
  }
});

test("medios: rangos de sufijo, rango abierto y HEAD conservan privacidad", async ({
  page,
  browser,
}) => {
  const id = await draft(page);
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#937aff" },
  })
    .png()
    .toBuffer();
  const response = await page.request.post(`/api/invitations/${id}/media`, {
    multipart: {
      authorized: "true",
      file: { name: "qa.png", mimeType: "image/png", buffer: image },
    },
  });
  expect(response.status()).toBe(201);
  const url = `/api/media/${(await response.json()).id}`;
  const full = await page.request.get(url);
  const bytes = await full.body();
  for (const [range, start, end] of [
    ["bytes=-16", bytes.length - 16, bytes.length - 1],
    ["bytes=8-", 8, bytes.length - 1],
    ["bytes=0-999999999999999999999", 0, bytes.length - 1],
  ] as const) {
    const partial = await page.request.get(url, { headers: { Range: range } });
    expect(partial.status(), range).toBe(206);
    expect(partial.headers()["content-range"]).toBe(
      `bytes ${start}-${end}/${bytes.length}`,
    );
    expect(await partial.body()).toEqual(bytes.subarray(start, end + 1));
  }
  const head = await page.request.head(url, {
    headers: { Range: "bytes=-16" },
  });
  expect(head.status()).toBe(200);
  expect(head.headers()["content-length"]).toBe(String(bytes.length));
  expect(await head.body()).toHaveLength(0);
  const invalid = await page.request.get(url, {
    headers: { Range: "bytes=-0" },
  });
  expect(invalid.status()).toBe(416);
  expect(invalid.headers()["cache-control"]).toContain("no-store");
  const guest = await browser.newContext();
  try {
    expect(
      (
        await guest.request.get(new URL(url, page.url()).href, {
          headers: { Range: "bytes=-16" },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await guest.close();
  }
});
