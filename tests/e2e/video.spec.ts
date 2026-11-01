import { test, expect, type Locator } from "./fixtures";
import { readFile } from "node:fs/promises";

const fixture = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

// Original footage generated once by scripts/generate-test-videos.mjs.
// WebKit on Windows can play the files but does not expose canvas.captureStream.
const footage = (color: string) =>
  readFile(
    new URL(
      `../fixtures/${color === "#d02020" ? "red" : "blue"}.webm`,
      import.meta.url,
    ),
  );

async function advancing(video: Locator) {
  await expect
    .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime))
    .toBeGreaterThan(0.2);
  expect(
    await video.evaluate((node: HTMLVideoElement) => node.error),
  ).toBeNull();
}

test("video real: cargar, reemplazar, controles, preview y publicación privada", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("FixturePass2027!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const ids: string[] = [];
  for (const [name, color] of [
    ["rojo.webm", "#d02020"],
    ["azul.webm", "#2030d0"],
    ["error-red.webm", "#2030d0"],
  ]) {
    const response = await page.request.post(
      `/api/invitations/${fixture}/media`,
      {
        multipart: {
          authorized: "true",
          file: {
            name,
            mimeType: "video/webm",
            buffer: await footage(color),
          },
        },
      },
    );
    expect(response.status()).toBe(201);
    ids.push((await response.json()).id);
  }
  await page.goto(`/app/invitaciones/${fixture}/editar`);
  await page
    .getByRole("button", { name: "Estilo y diseño", exact: true })
    .click();
  const select = page.getByRole("combobox", {
    name: "Video de fondo (según plan)",
    exact: true,
  });
  const video = page.locator(".canvas-frame video");
  await select.selectOption(ids[0]);
  await page
    .getByRole("button", { name: "Reproducir video", exact: true })
    .click();
  await advancing(video);
  await page.getByRole("button", { name: "Pausar video", exact: true }).click();
  await expect
    .poll(() => video.evaluate((node: HTMLVideoElement) => node.paused))
    .toBe(true);
  await select.selectOption(ids[1]);
  await expect
    .poll(() => video.evaluate((node: HTMLVideoElement) => node.currentSrc))
    .toContain(ids[1]);
  await page
    .getByRole("button", { name: "Reproducir video", exact: true })
    .click();
  await advancing(video);
  const rgb = await video.evaluate((node: HTMLVideoElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(node, 0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  });
  expect(rgb[2]).toBeGreaterThan(rgb[0] + 80);
  // Playback is controlled by an accessible icon; native chrome stays hidden.
  await expect(video).not.toHaveAttribute("controls");
  expect(
    await page
      .getByRole("button", { name: "Pausar video", exact: true })
      .evaluate((node) => {
        const r = node.getBoundingClientRect();
        return node.contains(
          document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
        );
      }),
  ).toBe(true);
  await page
    .getByRole("checkbox", {
      name: "Reproducción automática sin sonido",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", { name: "Reproducir video en bucle", exact: true })
    .check();
  await advancing(video);
  expect(await video.evaluate((node: HTMLVideoElement) => node.muted)).toBe(
    true,
  );
  await page
    .getByRole("button", { name: "Activar sonido", exact: true })
    .click();
  expect(await video.evaluate((node: HTMLVideoElement) => node.muted)).toBe(
    false,
  );
  await page
    .getByRole("button", { name: "Silenciar video", exact: true })
    .click();
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await page.reload();
  await page
    .getByRole("button", { name: "Estilo y diseño", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", {
      name: "Reproducción automática sin sonido",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "Reproducir video en bucle",
      exact: true,
    }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await advancing(dialog.locator("video"));
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  const draft = await (
    await page.request.get(`/api/invitations/${fixture}`)
  ).json();
  const published = await page.request.post(
    `/api/invitations/${fixture}/publish`,
    { data: { expectedRevision: draft.revision } },
  );
  expect(published.status()).toBe(200);
  // An unavailable draft file shows an error; switching back resets that error.
  // Use a fresh URL: Firefox may retain already decoded media across mounts.
  await page.route(`**/api/media/${ids[2]}`, (route) =>
    route.fulfill({ status: 503, body: "Unavailable test media" }),
  );
  await select.selectOption(ids[2]);
  await expect(page.locator(".canvas-frame [role=status]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reproducir video", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir video por separado ↗", exact: true }),
  ).toBeVisible();
  await select.selectOption(ids[1]);
  await expect(page.locator(".canvas-frame [role=status]")).toHaveCount(0);
  const guest = await browser.newContext();
  try {
    const visitor = await guest.newPage();
    expect((await visitor.request.get(`/api/media/${ids[1]}`)).status()).toBe(
      404,
    );
    await visitor.goto("/i/e2e-video");
    // A fresh visitor starts without a gesture, silently, and repeats at the end.
    expect(
      await visitor
        .locator("video")
        .evaluate((node: HTMLVideoElement) => node.muted),
    ).toBe(true);
    await advancing(visitor.locator("video"));
    let previousTime = 0;
    await expect
      .poll(async () => {
        const currentTime = await visitor
          .locator("video")
          .evaluate((node: HTMLVideoElement) => node.currentTime);
        const restarted =
          previousTime > 0.5 && currentTime < previousTime - 0.3;
        previousTime = currentTime;
        return restarted;
      })
      .toBe(true);
    await visitor
      .getByRole("button", { name: "Pausar video", exact: true })
      .click();
    await visitor
      .getByRole("button", { name: "Reproducir video", exact: true })
      .click();
    await advancing(visitor.locator("video"));
    await expect(visitor.locator("video")).not.toHaveAttribute("controls");
    await visitor.screenshot({
      path: "test-results/evidence/video-publico.png",
    });
    // The replaced file remains private; publishing exposes only referenced media.
    expect(
      (
        await visitor.request.get(`/api/media/${ids[0]}?slug=e2e-video`)
      ).status(),
    ).toBe(404);
  } finally {
    // Stop both looping pipelines before closing WebKit's media process.
    // Headless runners can otherwise hang in GStreamer/context.close.
    await Promise.allSettled(
      [page, ...guest.pages()].map((target) =>
        target.locator("video").evaluateAll((nodes) => {
          for (const node of nodes) {
            const video = node as HTMLVideoElement;
            video.pause();
            video.removeAttribute("src");
            video.load();
          }
        }),
      ),
    );
    await guest.close();
  }
});

test("video sin respuesta muestra carga, permite reintentar y recupera la reproducción", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("FixturePass2027!");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  const created = await page.request.post("/api/invitations", {
    data: { templateId: "pixvo-disco-night" },
  });
  expect(created.status()).toBe(201);
  const event = (await created.json()).id;
  const uploaded = await page.request.post(`/api/invitations/${event}/media`, {
    multipart: {
      authorized: "true",
      file: {
        name: "carga.webm",
        mimeType: "video/webm",
        buffer: await footage("#2030d0"),
      },
    },
  });
  expect(uploaded.status()).toBe(201);
  const id = (await uploaded.json()).id;
  await page.goto(`/app/invitaciones/${event}/editar`);
  await page
    .getByRole("button", { name: "Estilo y diseño", exact: true })
    .click();
  const pattern = `**/api/media/${id}`;
  // Intentionally leave the request pending: no HTTP error or browser error event.
  await page.route(pattern, () => {});
  await page
    .getByRole("combobox", { name: "Video de fondo (según plan)", exact: true })
    .selectOption(id);
  await page.clock.install();
  await page
    .getByRole("button", { name: "Reproducir video", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cargando video…", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".canvas-frame [role=status]")).toContainText(
    "Cargando video",
  );
  await page.clock.fastForward(21000);
  await expect(page.locator(".canvas-frame [role=status]")).toContainText(
    "está tardando en cargar",
  );
  await expect(
    page.getByRole("link", { name: "Abrir video por separado ↗", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reproducir video", exact: true }),
  ).toBeEnabled();
  await page.unroute(pattern);
  await page.clock.resume();
  await page
    .getByRole("button", { name: "Reproducir video", exact: true })
    .click();
  await advancing(page.locator(".canvas-frame video"));
  await expect(page.locator(".canvas-frame [role=status]")).toHaveCount(0);
});
