import { describe, it, expect } from "vitest";
import { mediaSelectionError, mediaLimits } from "../src/domain/media-policy";

describe("selección de archivos", () => {
  it.each([
    ["foto.jpg", "image/jpeg", mediaLimits.image],
    ["foto.png", "image/png", mediaLimits.image],
    ["foto.webp", "image/webp", mediaLimits.image],
    ["musica.mp3", "audio/mpeg", mediaLimits.audio],
    ["video.mp4", "video/mp4", mediaLimits.video],
    ["video.webm", "video/webm", mediaLimits.video],
  ])(
    "permite el límite exacto y rechaza un byte adicional: %s",
    (name, type, limit) => {
      expect(mediaSelectionError({ name, type, size: limit })).toBeUndefined();
      expect(mediaSelectionError({ name, type, size: limit + 1 })).toContain(
        `${limit / 1e6} MB`,
      );
    },
  );
  it("admite pistas del navegador ausentes y extensiones en mayúsculas", () => {
    expect(
      mediaSelectionError({ name: "VIDEO.MP4", type: "", size: 1000 }),
    ).toBeUndefined();
    expect(
      mediaSelectionError({
        name: "FOTO.JPG",
        type: "application/octet-stream",
        size: 1000,
      }),
    ).toBeUndefined();
  });
  it("rechaza formatos no admitidos y archivos vacíos", () => {
    expect(
      mediaSelectionError({
        name: "video.mov",
        type: "video/quicktime",
        size: 1000,
      }),
    ).toContain("Formato no admitido");
    expect(
      mediaSelectionError({ name: "vacio.mp4", type: "video/mp4", size: 0 }),
    ).toContain("vacío");
    expect(
      mediaSelectionError({
        name: "file.__proto__",
        type: "__proto__",
        size: 1000,
      }),
    ).toContain("Formato no admitido");
  });
});
