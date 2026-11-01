import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("favicon original de Pixvo disponible en PNG e ICO", async ({ page }) => {
  await page.goto("/");
  const icon = page.locator('link[rel="icon"][type="image/png"]');
  await expect(icon).toHaveCount(1);
  const response = await page.request.get((await icon.getAttribute("href"))!);
  expect(response.status()).toBe(200);
  const metadata = await sharp(await response.body()).metadata();
  expect([metadata.width, metadata.height]).toEqual([96, 96]);
  const ico = await page.request.get("/favicon.ico");
  expect(ico.status()).toBe(200);
  expect(Array.from((await ico.body()).subarray(0, 6))).toEqual([
    0, 0, 1, 0, 1, 0,
  ]);
});

test("guía visible y límite de video en navegador y API sin guardar archivos rechazados", async ({
  page,
}) => {
  const event = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const endpoint = `/api/invitations/${event}/media`;
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("FixturePass2027!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto(`/app/invitaciones/${event}/editar`);
  await page.getByRole("button", { name: "Archivos", exact: true }).click();
  await expect(page.locator("#media-upload-limits")).toContainText(
    "MP4 y WebM: máximo 10 MB",
  );
  await expect(page.locator("#video-upload-help")).toContainText("H.264");
  await page
    .getByText("Tamaño y orientación recomendados", { exact: true })
    .click();
  await expect(page.locator(".video-guidance")).toContainText("vertical 9:16");
  await expect(page.locator(".video-guidance")).toContainText(
    "horizontal 16:9",
  );
  await expect(page.locator(".video-guidance")).toContainText(
    "no es un límite de duración",
  );
  await page
    .getByLabel("Tengo autorización para usar estos archivos", { exact: true })
    .check();
  let sent = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === endpoint
    )
      sent++;
  });
  const oversized = Buffer.alloc(10_000_001);
  Buffer.from(
    "000000206674797069736f6d0000020069736f6d69736f32617663316d703431",
    "hex",
  ).copy(oversized);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "grande.mp4",
    mimeType: "video/mp4",
    buffer: oversized,
  });
  await expect(page.locator(".inspector").getByRole("alert")).toContainText(
    "El video supera el límite de 10 MB",
  );
  expect(sent).toBe(0);
  await expect(input).toHaveValue("");
  const before = await (await page.request.get(endpoint)).json();
  const rejected = await page.request.post(endpoint, {
    multipart: {
      authorized: "true",
      file: { name: "disfraz.mp3", mimeType: "audio/mpeg", buffer: oversized },
    },
  });
  expect(rejected.status()).toBe(413);
  expect((await rejected.json()).error).toContain(
    "El video supera el límite de 10 MB",
  );
  expect(await (await page.request.get(endpoint)).json()).toEqual(before);
  await page
    .locator(".inspector")
    .screenshot({ path: "test-results/evidence/guia-video-limites.png" });
  await page
    .getByRole("button", { name: "Estilo y diseño", exact: true })
    .click();
  await expect(page.locator("#video-background-help")).toContainText(
    "máximo 10 MB",
  );
});
