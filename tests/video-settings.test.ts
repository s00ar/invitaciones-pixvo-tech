import { expect, it } from "vitest";
import {
  changeTemplate,
  documentSchema,
  makeDocument,
} from "../src/domain/document";
import { publicProjection } from "../src/domain/public-projection";

it("los documentos existentes conservan inicio manual; autoplay debe ser booleano", () => {
  const raw = JSON.parse(JSON.stringify(makeDocument("pixvo-free-xv")));
  delete raw.theme.videoAutoplay;
  delete raw.theme.videoLoop;
  expect(documentSchema.parse(raw).theme.videoAutoplay).toBe(false);
  expect(documentSchema.parse(raw).theme.videoLoop).toBe(false);
  raw.theme.videoAutoplay = "true";
  expect(documentSchema.safeParse(raw).success).toBe(false);
});

it("cambiar template y publicar conserva la preferencia automática y los medios", () => {
  const doc = makeDocument("pixvo-free-xv");
  doc.theme.videoId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  doc.theme.videoAutoplay = true;
  doc.theme.videoLoop = true;
  const next = changeTemplate(doc, "pixvo-editorial-minimal");
  expect(next.theme.videoId).toBe(doc.theme.videoId);
  expect(next.theme.videoAutoplay).toBe(true);
  expect(next.theme.videoLoop).toBe(true);
  expect(publicProjection(documentSchema.parse(next)).theme.videoLoop).toBe(
    true,
  );
  expect(publicProjection(documentSchema.parse(next)).theme.videoAutoplay).toBe(
    true,
  );
});
