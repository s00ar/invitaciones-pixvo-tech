import { expect, it } from "vitest";
import { makeAzulDocument } from "../src/domain/azul";
import { googleCalendarUrl } from "../src/domain/format";

it("precarga un evento nocturno con zona, descripción y lugar sin depender de la zona del visitante", () => {
  const d = makeAzulDocument();
  d.event.title = "Cumpleaños & celebración";
  const url = new URL(googleCalendarUrl(d));
  expect(url.origin).toBe("https://calendar.google.com");
  expect(url.searchParams.get("action")).toBe("TEMPLATE");
  expect(url.searchParams.get("text")).toBe(d.event.title);
  expect(url.searchParams.get("dates")).toBe("20991206T000000Z/20991206T080000Z");
  expect(url.searchParams.get("ctz")).toBe("America/Argentina/Buenos_Aires");
  expect(url.searchParams.get("details")).toContain(d.event.message);
  expect(url.searchParams.get("details")).toContain("Vestimenta: Elegante sport");
  expect(url.searchParams.get("location")).toBe("Salón de ejemplo, Dirección del evento");
});

it("omite bloques deshabilitados y conserva duración de respaldo sin horario de fin", () => {
  const d = makeAzulDocument();
  delete d.event.endsAt;
  for (const b of d.blocks) b.enabled = false;
  const params = new URL(googleCalendarUrl(d)).searchParams;
  expect(params.get("dates")).toBe("20991206T000000Z/20991206T020000Z");
  expect(params.get("location")).toBe("");
  expect(params.get("details")).toBe(d.event.message);
});
