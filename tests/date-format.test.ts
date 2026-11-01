import { expect, it } from "vitest";
import { makeDocument } from "../src/domain/document";
import { dateLabel } from "../src/domain/format";

it("fecha española estable con horario de 24 horas en la zona del evento", () => {
  const doc = makeDocument("pixvo-free-xv");
  doc.event.startsAt = "2027-12-19T00:00:00.000Z";
  doc.event.timezone = "America/Argentina/Buenos_Aires";
  expect(dateLabel(doc)).toBe("18 de diciembre de 2027 · 21:00");
  expect(dateLabel(doc, false)).toBe("18 de diciembre de 2027");
  doc.event.timezone = "UTC";
  expect(dateLabel(doc)).toBe("19 de diciembre de 2027 · 00:00");
});

it("respeta el salto al horario de verano", () => {
  const doc = makeDocument("pixvo-free-xv");
  doc.event.startsAt = "2027-03-28T01:30:00.000Z";
  doc.event.timezone = "Europe/Rome";
  expect(dateLabel(doc)).toBe("28 de marzo de 2027 · 03:30");
});
