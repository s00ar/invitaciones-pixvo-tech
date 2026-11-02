import { readFile } from "node:fs/promises";
import path from "node:path";
import { localMode } from "@/server/db";
export const dynamic = "force-dynamic";
// Local review asset only. Production audio uses authenticated/private media storage.
export async function GET() {
  if (!localMode()) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(
      path.join(process.cwd(), ".data/azul/espresso-web.m4a"),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": "audio/mp4",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
