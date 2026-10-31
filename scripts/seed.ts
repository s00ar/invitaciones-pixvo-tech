import { Pool } from "pg";
import { seed } from "../src/server/db";
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await seed(pool);
  console.log(
    "27 templates y planes con precios ARS preparados; configuración existente conservada.",
  );
} finally {
  await pool.end();
}
