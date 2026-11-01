import { test, expect, type Page, type Locator } from "@playwright/test";

const fixture = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

// Original animated footage, generated in the browser; no third-party media.
async function footage(page: Page, color: string) {
  const bytes = await page.evaluate(async (color) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;
    const draw = () => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = "white";
      ctx.fillRect((Date.now() / 10) % 280, 150, 20, 20);
    };
    draw();
    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    const timer = setInterval(draw, 60);
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 2400));
    recorder.stop();
    await stopped;
    clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  }, color);
  return Buffer.from(bytes);
}

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
  ]) {
    const response = await page.request.post(
      `/api/invitations/${fixture}/media`,
      {
        multipart: {
          authorized: "true",
          file: {
            name,
            mimeType: "video/webm",
            buffer: await footage(page, color),
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
  // Native playback/seek controls must receive pointer events through the cover.
  expect(
    await video.evaluate((node) => {
      const r = node.getBoundingClientRect();
      return document.elementFromPoint(r.left + 25, r.bottom - 25) === node;
    }),
  ).toBe(true);
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Reproducir video", exact: true })
    .click();
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
  await page.route(`**/api/media/${ids[0]}`, (route) =>
    route.fulfill({ status: 503, body: "Unavailable test media" }),
  );
  await select.selectOption(ids[0]);
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
    await visitor
      .getByRole("button", { name: "Reproducir video", exact: true })
      .click();
    await advancing(visitor.locator("video"));
    const controls = await visitor.locator("video").evaluate((node) => {
      const r = node.getBoundingClientRect();
      return document.elementFromPoint(r.left + 25, r.bottom - 25) === node;
    });
    expect(controls).toBe(true);
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
    await guest.close();
  }
});
