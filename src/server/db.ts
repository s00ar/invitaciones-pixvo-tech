import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { readFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { defaultPlans, templates } from "../domain/document";

export type Row = Record<string, unknown>;
export interface DB {
  query<T = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
export const localMode = () =>
  process.env.PIXVO_LOCAL_DEV === "1" && process.env.NODE_ENV !== "production";
export const configured = () =>
  localMode() ||
  !!(
    process.env.DATABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
declare global {
  var pixvoDb: Promise<PGlite> | undefined;
  var pixvoPool: Pool | undefined;
}

export async function seed(db: DB) {
  for (const t of templates)
    await db.query(
      "insert into templates(id,version,category,config) values($1,$2,$3,$4) on conflict(id) do nothing",
      [t.id, t.version, t.category, JSON.stringify(t)],
    );
  for (const p of defaultPlans)
    await db.query(
      "insert into plans(id,name,price_minor,currency,entitlements) values($1,$2,$3,$4,$5) on conflict(id) do nothing",
      [p.id, p.name, p.price_minor, p.currency, JSON.stringify(p.entitlements)],
    );
}
export async function migrate(
  db: DB,
  exec: (sql: string) => Promise<unknown>,
  local = false,
) {
  if (local)
    await exec(
      `create schema if not exists auth;create table if not exists auth.users(id uuid primary key,email text unique);create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;do $$begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;create role anon;create role service_role bypassrls;end if;end$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema if not exists local_dev;create table if not exists local_dev.users(id uuid primary key references auth.users(id),email text unique,password_hash text not null);create table if not exists local_dev.sessions(token_hash text primary key,user_id uuid references auth.users(id),expires_at timestamptz not null);`,
    );
  await exec(
    "create table if not exists pixvo_migrations(name text primary key,applied_at timestamptz default now())",
  );
  for (const name of (
    await readdir(path.join(process.cwd(), "supabase/migrations"))
  ).sort()) {
    if (local && name.includes("storage")) continue;
    if (
      (
        await db.query("select name from pixvo_migrations where name=$1", [
          name,
        ])
      ).rows.length
    )
      continue;
    await exec(
      await readFile(
        path.join(process.cwd(), "supabase/migrations", name),
        "utf8",
      ),
    );
    await db.query("insert into pixvo_migrations(name) values($1)", [name]);
  }
  await seed(db);
}
async function localDB() {
  return (globalThis.pixvoDb ??= (async () => {
    const dir = path.resolve(
      /* turbopackIgnore: true */ process.env.PIXVO_DATA_DIR ?? ".data",
    );
    await mkdir(dir, { recursive: true });
    const db = new PGlite(path.join(dir, "postgres"));
    await db.waitReady;
    await db.transaction(async (tx) => {
      await migrate(tx, (s) => tx.exec(s), true);
    });
    return db;
  })());
}
// Privileged transactions are only imported by server modules. Every user operation
// verifies ownership before mutation. Browser Data API mutations are denied by SQL.
export async function transaction<T>(work: (db: DB) => Promise<T>): Promise<T> {
  if (localMode()) return (await localDB()).transaction(work);
  if (!process.env.DATABASE_URL)
    throw new Error("Configuración pendiente: Supabase DATABASE_URL");
  const pool = (globalThis.pixvoPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  }));
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role service_role");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
export async function asOwner<T>(id: string, work: (db: DB) => Promise<T>) {
  return transaction(async (db) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    await db.query("set local role authenticated");
    return work(db);
  });
}
