import { describe, expect, it } from "vitest";
import { mediaResponse } from "../src/server/media-response";

const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
describe("HTTP media ranges", () => {
  it.each([
    ["bytes=0-1", 0, 1],
    ["bytes=3-", 3, 7],
    ["bytes=-3", 5, 7],
    ["bytes=-99999999999999999999999", 0, 7],
    ["bytes=0-99999999999999999999999", 0, 7],
  ])(
    "responde contenido parcial correcto para %s",
    async (range, start, end) => {
      const response = mediaResponse(bytes, "video/mp4", range);
      expect(response.status).toBe(206);
      expect(response.headers.get("content-range")).toBe(
        `bytes ${start}-${end}/8`,
      );
      expect(response.headers.get("content-length")).toBe(
        String(end - start + 1),
      );
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(
        bytes.subarray(start, end + 1),
      );
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );
  it.each(["bytes=-0", "bytes=8-", "bytes=4-2", "bytes=-", "bytes=broken"])(
    "rechaza rango inválido %s sin cachear",
    (range) => {
      const response = mediaResponse(bytes, "video/mp4", range);
      expect(response.status).toBe(416);
      expect(response.headers.get("content-range")).toBe("bytes */8");
      expect(response.headers.get("cache-control")).toContain("no-store");
    },
  );
  it.each([null, "items=0-2", "bytes=0-1,4-5"])(
    "sirve contenido completo si no procesa el rango %s",
    async (range) => {
      const response = mediaResponse(bytes, "video/mp4", range);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("video/mp4");
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    },
  );
  it("archivos vacíos: GET completo o rango no satisfacible", () => {
    expect(mediaResponse(new Uint8Array(), "video/mp4", null).status).toBe(200);
    expect(
      mediaResponse(new Uint8Array(), "video/mp4", "bytes=0-").status,
    ).toBe(416);
  });
});
