import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { defaultPlans, templates } from "../domain/document";

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** Offline SQL Editor alternative to migrate(); never contains credentials. */
export async function buildBootstrapSQL() {
  const directory = path.join(process.cwd(), "supabase/migrations");
  const statements = [
    "-- Pixvo Invitaciones: ejecutar completo en Supabase > SQL Editor > New query.",
    "-- Generado con npm run db:bootstrap-sql. No editar; regenerar desde migraciones y catálogo.",
    "-- Crea tablas, permisos, bucket privado y seed. No habilita pagos ni borra datos.",
    "begin;",
    "set local standard_conforming_strings = on;",
    "select pg_advisory_xact_lock(hashtext('pixvo-bootstrap-v1'));",
    "create table if not exists public.pixvo_migrations(name text primary key, applied_at timestamptz default now());",
    `do $pixvo_guard$ begin
  if not exists (select 1 from public.pixvo_migrations where name='202610310001_platform.sql')
     and exists (select 1 from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name<>'pixvo_migrations') then
    raise exception 'Pixvo: la base no está vacía y no registra la migración inicial. No se aplicaron cambios. Revisar el esquema antes de continuar.';
  end if;
end $pixvo_guard$;`,
  ];
  const names = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const [index, name] of names.entries()) {
    const source = (await readFile(path.join(directory, name), "utf8")).replaceAll(
      "\r\n",
      "\n",
    );
    const delimiter = `$pixvo_migration_${index}$`;
    if (source.includes(delimiter)) throw new Error("SQL delimiter collision");
    statements.push(`do $pixvo_apply_${index}$ begin
  if not exists (select 1 from public.pixvo_migrations where name=${literal(name)}) then
    execute ${delimiter}\n${source}\n${delimiter};
    insert into public.pixvo_migrations(name) values(${literal(name)});
  end if;
end $pixvo_apply_${index}$;`);
  }
  for (const t of templates)
    statements.push(
      `insert into public.templates(id,version,category,config) values(${literal(t.id)},${t.version},${literal(t.category)},${literal(JSON.stringify(t))}::jsonb) on conflict(id) do nothing;`,
    );
  for (const p of defaultPlans)
    statements.push(
      `insert into public.plans(id,name,price_minor,currency,entitlements) values(${literal(p.id)},${literal(p.name)},${p.price_minor},${literal(p.currency)},${literal(JSON.stringify(p.entitlements))}::jsonb) on conflict(id) do nothing;`,
    );
  statements.push(
    "alter table public.pixvo_migrations enable row level security;",
    "revoke all on public.pixvo_migrations from anon,authenticated;",
    "notify pgrst, 'reload schema';",
    "commit;",
    "select (select count(*) from public.templates) as templates, (select count(*) from public.plans) as plans, (select count(*) from public.pixvo_migrations) as migrations;",
  );
  return statements.join("\n\n") + "\n";
}
