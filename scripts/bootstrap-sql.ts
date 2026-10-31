import { writeFile } from "node:fs/promises";
import { buildBootstrapSQL } from "../src/server/bootstrap-sql";

await writeFile("supabase/bootstrap.sql", await buildBootstrapSQL());
console.log(
  "supabase/bootstrap.sql generado; no se conectó a ninguna base de datos.",
);
