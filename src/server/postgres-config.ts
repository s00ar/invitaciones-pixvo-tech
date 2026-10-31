import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PoolConfig } from "pg";

type DatabaseEnvironment = {
  DATABASE_URL?: string;
  DATABASE_SSL_CA?: string;
};

/** Shared by the runtime, migration runner and seed. Never logs credentials. */
export function postgresConfig(
  env: DatabaseEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
  },
): PoolConfig {
  if (!env.DATABASE_URL) throw new Error("Falta DATABASE_URL");
  const base: PoolConfig = {
    connectionString: env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 15000,
  };
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new Error("Invalid protocol");
  } catch {
    throw new Error("DATABASE_URL debe ser una conexión PostgreSQL válida");
  }
  const hostname = url.hostname.toLowerCase();
  const supabaseHost =
    hostname.endsWith(".pooler.supabase.com") ||
    /^db\.[a-z0-9-]+\.supabase\.co$/.test(hostname);
  const explicitCA = env.DATABASE_SSL_CA?.trim();
  if (!explicitCA && !supabaseHost) return base;
  const source =
    explicitCA ??
    readFileSync(
      path.join(process.cwd(), "certs/supabase-root-2021.crt"),
      "utf8",
    );
  const ca = source
    .replaceAll("\\r\\n", "\n")
    .replaceAll("\\n", "\n")
    .replaceAll("\r\n", "\n")
    .trim();
  try {
    if (ca.includes("PRIVATE KEY") || !new X509Certificate(ca).ca)
      throw new Error("Invalid CA");
  } catch {
    throw new Error(
      "El certificado CA PostgreSQL debe ser válido y estar en formato PEM",
    );
  }
  if (url.searchParams.has("sslcert") || url.searchParams.has("sslkey"))
    throw new Error(
      "DATABASE_SSL_CA no se combina con certificados de cliente en DATABASE_URL",
    );
  // pg replaces the entire ssl object when these URI fields are present.
  // The explicit CA configuration always verifies both chain and hostname.
  for (const name of ["sslmode", "sslrootcert", "ssl", "uselibpqcompat"])
    url.searchParams.delete(name);
  return {
    ...base,
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}
