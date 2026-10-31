import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const certificate = path.resolve("certs/supabase-root-2021.crt");
const tracePath = path.resolve(".next/server/app/page.js.nft.json");
const trace = JSON.parse(readFileSync(tracePath, "utf8"));
if (
  !existsSync(certificate) ||
  !trace.files.some(
    (file) => path.resolve(path.dirname(tracePath), file) === certificate,
  )
) {
  throw new Error(
    "La CA pública de Supabase no está incluida en el artefacto del servidor Next.js",
  );
}
console.log(
  "CA pública de Supabase incluida en el trazado del servidor de producción.",
);
