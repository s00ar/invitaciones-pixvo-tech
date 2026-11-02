import { test, expect } from "./fixtures";

test("agenda precargada y WhatsApp automático únicamente después de guardar asistencia", async ({ page }) => {
  await page.route("https://wa.me/**", route => route.fulfill({ contentType: "text/html", body: "<h1>WhatsApp de prueba</h1>" }));
  await page.goto("/exclusivas/e2e-exclusive");
  await page.getByRole("button", { name: /Abrir invitación/ }).click();
  const calendar = new URL((await page.getByRole("link", { name: "Agendar este día en Google Calendar" }).getAttribute("href"))!);
  expect(calendar.hostname).toBe("calendar.google.com");
  expect(calendar.searchParams.get("text")).toBe("Celebración de prueba");
  expect(calendar.searchParams.get("location")).toContain("Dirección ficticia");
  await page.getByLabel("Nombre y apellido de quien confirma").fill("Familia de prueba automática");
  await page.getByLabel("Personas del grupo, incluyéndote").fill("2");
  await page.getByLabel("Nombres y apellidos de los integrantes").fill("Persona Uno y Persona Dos");
  await page.route("**/api/public/e2e-exclusive/rsvp", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "No se pudo guardar la prueba" }) }));
  await page.getByRole("button", { name: "Confirmar respuesta" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No se pudo guardar la prueba" })).toBeVisible();
  await expect(page).toHaveURL(/\/exclusivas\/e2e-exclusive$/);
  await page.unroute("**/api/public/e2e-exclusive/rsvp");
  await page.getByRole("button", { name: "Confirmar respuesta" }).click();
  await expect(page).toHaveURL(/^https:\/\/wa\.me\/5491100000000\?text=/);
  expect(new URL(page.url()).searchParams.get("text")).toContain("2 persona(s)");
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("FixturePass2027!");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  const replies = await (await page.request.get("/api/invitations/cccccccc-cccc-4ccc-8ccc-cccccccccccc/rsvps")).json();
  expect(replies).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Familia de prueba automática", attendees: 2 })]));
});
