import { test, expect, type Page } from "@playwright/test";
import { templates } from "../../src/domain/document";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import jsQR from "jsqr";
const fixture = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function login(page: Page, email = "owner@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("FixturePass2027!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/app$/);
}
test("landing y catálogo responsive, 27 presets y cinco familias", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Tu gran momento/ }),
  ).toBeVisible();
  for (const route of ["/precios", "/"]) {
    await page.goto(route);
    for (const [name, amount] of [
      ["Invitación básica", "35.000"],
      ["Invitación interactiva", "60.000"],
      ["Invitación premium", "100.000"],
    ]) {
      const card = page
        .locator(".plan-card")
        .filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(card.locator(".plan-price")).toHaveText(
        new RegExp(`\\$\\s*${amount.replaceAll(".", "\\.")}`),
      );
    }
    await expect(page.locator(".plans-note")).toContainText(
      "Se pueden agregar adicionales según funcionalidades extra",
    );
    await expect(page.locator(".plan-integration-status")).toContainText(
      "Google Sheets: integración pendiente",
    );
  }
  await page.screenshot({
    caret: "initial",
    path: "test-results/evidence/landing-desktop.png",
    fullPage: true,
  });
  await page.goto("/templates");
  await expect(page.locator(".template-card")).toHaveCount(27);
  await page.getByRole("button", { name: "Quince años", exact: true }).click();
  await expect(page.locator(".template-card")).toHaveCount(6);
  await expect(page).toHaveURL(/category=xv/);
  await page.reload();
  await expect(page.locator(".template-card")).toHaveCount(6);
  await page.screenshot({
    caret: "initial",
    path: "test-results/evidence/catalogo.png",
    fullPage: true,
  });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("/precios");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390) {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations.map((v) => v.id)).toEqual([]);
      await page.screenshot({
        path: "test-results/evidence/precios-mobile.png",
        fullPage: true,
        caret: "initial",
      });
    }
    if (width === 1440)
      await page.screenshot({
        path: "test-results/evidence/precios-desktop.png",
        fullPage: true,
        caret: "initial",
      });
    for (const family of [
      "editorial",
      "ornamental",
      "party",
      "kids",
      "corporate",
    ]) {
      const t = templates.find((t) => t.family === family)!;
      await page.goto(`/preview/${t.id}`);
      await expect(page.locator(`.hero-${family}`)).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
});
test("selección persiste al registrarse, crear, guardar y reabrir", async ({
  page,
}) => {
  await page.goto("/preview/pixvo-editorial-minimal");
  await page.getByRole("link", { name: "Usar diseño" }).click();
  await expect(page).toHaveURL(/login\?next=/);
  await page.getByRole("link", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/\/registro\?next=/);
  await expect(
    page.getByRole("heading", { name: "Tu historia empieza acá." }),
  ).toBeVisible();
  await page
    .getByLabel("Email", { exact: true })
    .fill(`nuevo-${Date.now()}@example.test`);
  await page.getByLabel("Contraseña", { exact: true }).fill("NuevaClave2027!");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/invitaciones\/.+\/editar$/);
  await expect(page.locator(".hero-editorial")).toBeVisible();
  const url = page.url();
  await page
    .getByLabel("Nombre del evento", { exact: true })
    .fill("Sofía y Mateo · prueba E2E");
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await page.reload();
  await expect(
    page.getByLabel("Nombre del evento", { exact: true }),
  ).toHaveValue("Sofía y Mateo · prueba E2E");
  const id = url.split("/").at(-2)!;
  const data = await (await page.request.get(`/api/invitations/${id}`)).json();
  expect((await page.request.get(`/api/public/${data.slug}`)).status()).toBe(
    404,
  );
  await page.goto("/app/pagos?status=approved&payment_id=123");
  expect(
    (
      await page.request.post(`/api/invitations/${id}/publish`, {
        data: { expectedRevision: data.revision },
      })
    ).status(),
  ).toBe(403);
  await page.goto(url);
  await page.getByRole("button", { name: "Revisar y publicar" }).click();
  await page.getByRole("button", { name: "Continuar a Mercado Pago" }).click();
  await expect(page.locator(".notice.error")).toContainText(
    "Configuración pendiente",
  );
});
test("edición, template, undo, publicación separada, RSVP y CSV", async ({
  page,
  browser,
}) => {
  await login(page);
  await page.goto(`/app/invitaciones/${fixture}/editar`);
  await page
    .getByLabel("Nombre del evento", { exact: true })
    .fill("Los quince de Emilia · E2E");
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await page
    .getByRole("button", { name: "Estilo y diseño", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Template", exact: true })
    .selectOption("pixvo-neon-party");
  await page.getByRole("button", { name: "Aplicar este diseño" }).click();
  await expect(page.locator(".hero-party")).toBeVisible();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator(".hero-ornamental")).toBeVisible();
  await page.getByRole("button", { name: "Rehacer", exact: true }).click();
  await expect(page.locator(".hero-party")).toBeVisible();
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await page.screenshot({
    caret: "initial",
    path: "test-results/evidence/editor-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Vista", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    caret: "initial",
    path: "test-results/evidence/editor-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Revisar y publicar" }).click();
  await page.getByRole("button", { name: "Publicar esta versión" }).click();
  await expect(page).toHaveURL(/\/compartir/);
  await expect(
    page.getByAltText("Código QR de la invitación publicada"),
  ).toBeVisible();
  const qrSrc = await page
    .getByAltText("Código QR de la invitación publicada")
    .getAttribute("src");
  const decodedImage = await sharp(Buffer.from(qrSrc!.split(",")[1], "base64"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const decoded = jsQR(
    new Uint8ClampedArray(decodedImage.data),
    decodedImage.info.width,
    decodedImage.info.height,
  );
  expect(decoded?.data).toBe("http://127.0.0.1:3001/i/e2e-celebracion");
  await page.screenshot({
    caret: "initial",
    path: "test-results/evidence/publicacion.png",
    fullPage: true,
  });
  const guest = await browser.newContext();
  const publicPage = await guest.newPage();
  await publicPage.goto("http://127.0.0.1:3001/i/e2e-celebracion");
  await expect(
    publicPage.getByRole("heading", {
      name: "Los quince de Emilia · E2E",
      exact: true,
    }),
  ).toBeVisible();
  await publicPage
    .getByLabel("Tu nombre", { exact: true })
    .fill("=Invitada de prueba");
  await publicPage
    .getByRole("button", { name: "Confirmar respuesta", exact: true })
    .click();
  await expect(publicPage.getByRole("status")).toContainText("guardada");
  await publicPage.getByLabel("No puedo asistir", { exact: true }).check();
  await publicPage
    .getByRole("button", { name: "Actualizar respuesta" })
    .click();
  await expect(publicPage.getByRole("status")).toContainText("guardada");
  await publicPage.screenshot({
    path: "test-results/evidence/invitacion-publica.png",
    fullPage: true,
  });
  await page.goto(`/app/invitaciones/${fixture}/editar`);
  await page
    .getByLabel("Nombre del evento", { exact: true })
    .fill("Este cambio sigue privado");
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", {
      name: "Los quince de Emilia · E2E",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/app/invitaciones/${fixture}/respuestas`);
  await expect(
    page.getByRole("cell", { name: "No asiste", exact: true }),
  ).toBeVisible();
  const r = await page.request.get(`/api/invitations/${fixture}/export.csv`);
  expect(await r.text()).toContain("'=Invitada de prueba");
  await page.screenshot({
    caret: "initial",
    path: "test-results/evidence/respuestas.png",
    fullPage: true,
  });
  await guest.close();
});
test("controles accesibles, contraste y teclado en páginas principales", async ({
  page,
}) => {
  for (const url of ["/", "/templates", "/login", "/preview/pixvo-glam-pink"]) {
    await page.goto(url);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await login(page);
  await page.goto(`/app/invitaciones/${fixture}/editar`);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("API y UI aíslan propietarios, CSV, medios, pagos y administración", async ({
  page,
}) => {
  await login(page, "other@example.test");
  for (const suffix of ["", "/rsvps", "/media", "/export.csv", "/versions"])
    expect(
      (await page.request.get(`/api/invitations/${fixture}${suffix}`)).status(),
    ).toBe(404);
  expect((await page.request.get("/api/orders")).status()).toBe(200);
  expect(await (await page.request.get("/api/orders")).json()).toEqual([]);
  expect(
    (
      await page.request.post(`/api/invitations/${fixture}/publish`, {
        data: { expectedRevision: 1 },
      })
    ).status(),
  ).toBe(404);
  expect((await page.request.get("/api/admin")).status()).toBe(403);
  await page.goto(`/app/invitaciones/${fixture}/editar`);
  await expect(
    page.getByRole("heading", { name: "Este enlace no está disponible." }),
  ).toBeVisible();
});
test("autosave muestra fallo de red, recupera borrador y detecta conflicto", async ({
  page,
  context,
}) => {
  await login(page);
  await page.goto(`/app/invitaciones/${fixture}/editar`);
  await page.route(`**/api/invitations/${fixture}`, async (route) => {
    if (route.request().method() === "PATCH")
      await route.abort("internetdisconnected");
    else await route.continue();
  });
  await page
    .getByLabel("Nombre del evento", { exact: true })
    .fill("Cambio recuperable sin red");
  await expect(page.locator('.restore-alert[role="alert"]')).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Hay cambios recuperables", { exact: false }),
  ).toBeVisible();
  await page.unroute(`**/api/invitations/${fixture}`);
  await page.getByRole("button", { name: "Recuperar borrador" }).click();
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  const second = await context.newPage();
  await second.goto(`/app/invitaciones/${fixture}/editar`);
  await page
    .getByLabel("Nombre del evento", { exact: true })
    .fill("Ganó la primera pestaña");
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await second
    .getByLabel("Nombre del evento", { exact: true })
    .fill("Cambio en conflicto");
  await expect(second.locator('.restore-alert[role="alert"]')).toContainText(
    "versión más reciente",
  );
  await expect(
    second.getByRole("button", { name: "Descargar mis cambios" }),
  ).toBeVisible();
  await second.close();
});
test("admin configura planes y visibilidad con auditoría, sin aprobar pagos", async ({
  page,
}) => {
  await login(page, "admin@example.test");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "Votos Editoriales" });
  await row.getByRole("button", { name: "Ocultar" }).click();
  await expect(page.getByRole("status")).toContainText("registrado");
  const result = await page.request.post("/api/invitations", {
    data: { templateId: "pixvo-editorial-minimal" },
  });
  expect(result.status()).toBe(422);
  await row.getByRole("button", { name: "Activar", exact: true }).click();
  await page.getByRole("button", { name: "Pagos", exact: true }).click();
  await expect(
    page.getByText("No se aprueban pagos manualmente", { exact: false }),
  ).toBeVisible();
});

test("cinco muestras XV, estilos accesibles y selección persistente en editor y encargo", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/personalizadas");
  await expect(page.locator(".custom-sample-card")).toHaveCount(5);
  await page.screenshot({
    path: "test-results/evidence/muestras-xv.png",
    fullPage: true,
    caret: "initial",
  });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of [
      "romantica",
      "black-neon",
      "royal",
      "mariposas",
      "sobre-premium",
    ]) {
      await page.goto(`/personalizadas/${slug}`);
      await expect(
        page.getByRole("heading", { name: "Valentina", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 390) {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(
          result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ).toEqual([]);
        await page.screenshot({
          path: `test-results/evidence/muestra-${slug}-mobile.png`,
          fullPage: true,
          caret: "initial",
        });
      }
    }
  }
  await page.goto("/personalizadas/sobre-premium");
  await page.getByRole("link", { name: "Usar este estilo" }).click();
  await expect(page).toHaveURL(/login\?next=/);
  await expect(
    page.getByRole("heading", { name: "Qué bueno verte." }),
  ).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("FixturePass2027!");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/app\/invitaciones\/.+\/editar$/);
  await expect(page.locator(".invitation.sample-envelope")).toBeVisible();
  const editorURL = page.url();
  await page
    .getByLabel("Nombre del evento", { exact: true })
    .fill("Los quince de Julieta");
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  await page.reload();
  await expect(
    page.getByLabel("Nombre del evento", { exact: true }),
  ).toHaveValue("Los quince de Julieta");
  await page
    .getByRole("button", { name: "Estilo y diseño", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Muestra personalizada XV" })
    .selectOption("butterfly");
  await expect(page.locator(".invitation.sample-butterfly")).toBeVisible();
  await expect(page.locator(".editor-title small")).toContainText("Guardado");
  const stored = await (
    await page.request.get(`/api/invitations/${editorURL.split("/").at(-2)}`)
  ).json();
  expect(stored.draft_json.theme.sampleStyle).toBe("butterfly");
  expect(stored.draft_json.event.title).toBe("Los quince de Julieta");
  await page.goto("/personalizadas/royal");
  await page
    .getByRole("link", { name: "Solicitar personalización", exact: false })
    .click();
  await expect(page).toHaveURL(/app\/personalizado\?sample=royal/);
  await expect(page.getByRole("textbox", { name: "Tu idea" })).toHaveValue(
    /Royal/,
  );
  await page.getByRole("button", { name: "Guardar solicitud" }).click();
  await expect(
    page.locator(".notice").filter({ hasText: "Solicitud guardada" }),
  ).toBeVisible();
  const requests = await (
    await page.request.get("/api/custom-requests")
  ).json();
  expect(
    requests.some((r: { brief: string }) => r.brief.includes("Royal")),
  ).toBe(true);
  expect(
    (
      await page.request.post("/api/invitations", {
        data: { templateId: "pixvo-free-xv", sampleId: "unsafe" },
      })
    ).status(),
  ).toBe(422);
});
