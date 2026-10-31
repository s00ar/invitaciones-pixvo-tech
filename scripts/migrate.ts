import { Pool } from "pg";
import { migrate } from "../src/server/db";
if (!process.env.DATABASE_URL)
  throw new Error("Falta DATABASE_URL. No se ejecutó ninguna migración.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("begin");
  await migrate(client, (s) => client.query(s));
  await client.query("commit");
  console.log("Migraciones y seed aplicados.");
} catch (e) {
  await client.query("rollback");
  throw e;
} finally {
  client.release();
  await pool.end();
}
