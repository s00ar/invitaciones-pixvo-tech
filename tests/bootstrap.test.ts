import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { it, expect } from "vitest";
import { buildBootstrapSQL } from "../src/server/bootstrap-sql";

async function emptySupabaseFixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,name text,bucket_id text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
  `);
  return db;
}

it("el SQL entregado aplica el esquema completo una vez y conserva ajustes y datos al repetirse", async () => {
  const sql = await buildBootstrapSQL();
  expect(await readFile("supabase/bootstrap.sql", "utf8")).toBe(sql);
  const db = await emptySupabaseFixture();
  try {
    await db.exec(sql);
    expect((await db.query("select * from templates")).rows).toHaveLength(27);
    expect(
      (await db.query("select * from pixvo_migrations")).rows,
    ).toHaveLength(3);
    expect(
      (
        await db.query<{ price_minor: number }>(
          "select price_minor from plans order by price_minor",
        )
      ).rows.map((p) => p.price_minor),
    ).toEqual([3500000, 6000000, 10000000]);
    expect(
      (
        await db.query<{ public: boolean }>(
          "select public from storage.buckets where id='pixvo-private'",
        )
      ).rows[0].public,
    ).toBe(false);
    expect(
      (
        await db.query(
          "select * from pg_policies where schemaname='storage' and policyname='pixvo_media_owner'",
        )
      ).rows,
    ).toHaveLength(1);
    await db.exec(
      "update plans set price_minor=3600000 where id='standard'; update templates set active=false where id='pixvo-free-xv'; insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'); insert into profiles(id,display_name) values('11111111-1111-4111-8111-111111111111','Fixture');",
    );
    await db.exec(sql);
    expect(
      (
        await db.query<{ price_minor: number }>(
          "select price_minor from plans where id='standard'",
        )
      ).rows[0].price_minor,
    ).toBe(3600000);
    expect(
      (
        await db.query<{ active: boolean }>(
          "select active from templates where id='pixvo-free-xv'",
        )
      ).rows[0].active,
    ).toBe(false);
    await db.exec("set role anon;");
    expect((await db.query("select * from plans")).rows).toHaveLength(3);
    await expect(db.query("select * from profiles")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(
      db.query("update plans set price_minor=1"),
    ).rejects.toMatchObject({ code: "42501" });
    await db.exec(
      "reset role; set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';",
    );
    expect((await db.query("select * from profiles")).rows).toHaveLength(1);
  } finally {
    await db.close();
  }
});

it("el bootstrap rechaza una base ajena sin cambios parciales", async () => {
  const db = await emptySupabaseFixture();
  try {
    await db.exec(
      "create table public.unrelated(id int primary key); insert into public.unrelated values(1);",
    );
    await expect(db.exec(await buildBootstrapSQL())).rejects.toMatchObject({
      code: "P0001",
    });
    await db.exec("rollback;");
    expect((await db.query("select * from unrelated")).rows).toEqual([
      { id: 1 },
    ]);
    expect(
      (
        await db.query<{ table_name: string }>(
          "select table_name from information_schema.tables where table_schema='public'",
        )
      ).rows.map((r) => r.table_name),
    ).toEqual(["unrelated"]);
  } finally {
    await db.close();
  }
});
