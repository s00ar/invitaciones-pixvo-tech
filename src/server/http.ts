import { fail } from "./errors";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url)
    .origin;
  if (origin && origin !== expected) fail(403, "Origen no autorizado");
  if (!origin && request.headers.get("sec-fetch-site") === "cross-site")
    fail(403, "Origen no autorizado");
}
export async function jsonBody(request: Request) {
  const raw = new TextDecoder().decode(await limitedBody(request, 300000));
  try {
    return JSON.parse(raw);
  } catch {
    fail(400, "JSON inválido");
  }
}
export async function limitedBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length") ?? 0) > max)
    fail(413, "El contenido supera el tamaño permitido");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      fail(413, "El contenido supera el tamaño permitido");
    }
    chunks.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return data;
}
export const noStore = { "Cache-Control": "private, no-store" };
export function clientIP(r: Request) {
  return process.env.TRUST_PROXY === "true"
    ? (r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown")
    : "local";
}
