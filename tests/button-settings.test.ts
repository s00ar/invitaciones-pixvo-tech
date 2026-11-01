import { expect, it } from "vitest";
import {
  applySample,
  changeTemplate,
  documentSchema,
  makeDocument,
} from "../src/domain/document";
import { publicProjection } from "../src/domain/public-projection";

it("mantiene el tamaño previo y rechaza tamaños de botón fuera del rango", () => {
  const raw = JSON.parse(JSON.stringify(makeDocument("pixvo-free-xv")));
  delete raw.theme.buttonScale;
  expect(documentSchema.parse(raw).theme.buttonScale).toBe(1);
  for (const value of [0, 0.69, 1.26, "0.7", null]) {
    raw.theme.buttonScale = value;
    expect(documentSchema.safeParse(raw).success).toBe(false);
  }
  for (const value of [0.7, 1, 1.25]) {
    raw.theme.buttonScale = value;
    expect(documentSchema.parse(raw).theme.buttonScale).toBe(value);
  }
});

it("conserva el tamaño al cambiar plantilla, muestra y proyección pública", () => {
  const doc = makeDocument("pixvo-free-xv");
  doc.theme.buttonScale = 0.7;
  const next = applySample(
    changeTemplate(doc, "pixvo-editorial-minimal"),
    "romantic",
  );
  expect(next.theme.buttonScale).toBe(0.7);
  expect(publicProjection(documentSchema.parse(next)).theme.buttonScale).toBe(
    0.7,
  );
});
