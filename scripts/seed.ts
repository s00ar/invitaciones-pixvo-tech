import { Pool } from "pg";
import { seed } from "../src/server/db";
import { postgresConfig } from "../src/server/postgres-config";
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const pool = new Pool(postgresConfig());
try {
  await seed(pool);
  console.log(
    "Templates y planes con precios ARS preparados; configuración existente conservada.",
  );
} finally {
  await pool.end();
}
