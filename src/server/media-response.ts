import { noStore } from "./http";

// RFC 9110, section 14: offsets are inclusive; suffixes count from the end.
export function mediaResponse(
  bytes: Uint8Array,
  mime: string,
  range: string | null,
) {
  const total = bytes.length;
  let start = 0,
    end = total - 1,
    status = 200;
  const value = range?.trim();
  // Unsupported units/multipart ranges can be ignored and served as a full GET.
  if (value && /^bytes=/i.test(value) && !value.includes(",")) {
    const match = /^bytes=(\d*)-(\d*)$/i.exec(value);
    const invalid = () =>
      new Response(null, {
        status: 416,
        headers: {
          ...noStore,
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes */${total}`,
          "Content-Length": "0",
        },
      });
    if (!match || (!match[1] && !match[2]) || total === 0) return invalid();
    const size = BigInt(total);
    if (!match[1]) {
      const suffix = BigInt(match[2]);
      if (suffix === 0n) return invalid();
      start = Number(suffix >= size ? 0n : size - suffix);
    } else {
      const first = BigInt(match[1]);
      const last = match[2] ? BigInt(match[2]) : size - 1n;
      if (first >= size || first > last) return invalid();
      start = Number(first);
      end = Number(last >= size ? size - 1n : last);
    }
    status = 206;
  }
  return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
    status,
    headers: {
      ...noStore,
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Content-Length": String(Math.max(0, end - start + 1)),
      ...(status === 206
        ? { "Content-Range": `bytes ${start}-${end}/${total}` }
        : {}),
    },
  });
}
