import { afterAll, beforeAll, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import tls from "node:tls";
import net from "node:net";
import { X509Certificate } from "node:crypto";
import { Client } from "pg";
import { postgresConfig } from "../src/server/postgres-config";

const fixtureURL = "postgresql://fixture:fixture-only@localhost:5432/postgres";
let directory: string, ca: string, key: string, certificate: string;
beforeAll(async () => {
  directory = await mkdtemp(path.join(process.cwd(), ".test-data-tls-"));
  const openssl =
    process.platform === "win32"
      ? path.join(
          process.env.ProgramFiles ?? "C:/Program Files",
          "Git/usr/bin/openssl.exe",
        )
      : "openssl";
  execFileSync(
    openssl,
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-keyout",
      path.join(directory, "ca.key"),
      "-out",
      path.join(directory, "fixture.crt"),
      "-subj",
      "/CN=Pixvo ephemeral test root",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
    ],
    { stdio: "pipe" },
  );
  ca = await readFile(path.join(directory, "fixture.crt"), "utf8");
  execFileSync(
    openssl,
    [
      "req",
      "-new",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      path.join(directory, "fixture.key"),
      "-out",
      path.join(directory, "server.csr"),
      "-subj",
      "/CN=localhost",
    ],
    { stdio: "pipe" },
  );
  await writeFile(
    path.join(directory, "server.ext"),
    "subjectAltName=DNS:localhost\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n",
  );
  execFileSync(
    openssl,
    [
      "x509",
      "-req",
      "-in",
      path.join(directory, "server.csr"),
      "-CA",
      path.join(directory, "fixture.crt"),
      "-CAkey",
      path.join(directory, "ca.key"),
      "-CAcreateserial",
      "-days",
      "1",
      "-extfile",
      path.join(directory, "server.ext"),
      "-out",
      path.join(directory, "server.crt"),
    ],
    { stdio: "pipe" },
  );
  certificate = await readFile(path.join(directory, "server.crt"), "utf8");
  execFileSync(
    openssl,
    [
      "verify",
      "-CAfile",
      path.join(directory, "fixture.crt"),
      path.join(directory, "server.crt"),
    ],
    { stdio: "pipe" },
  );
  key = await readFile(path.join(directory, "fixture.key"), "utf8");
});
afterAll(async () => {
  if (!directory) return;
  const relative = path.relative(process.cwd(), directory);
  if (
    path.isAbsolute(relative) ||
    relative.startsWith("..") ||
    !path.basename(directory).startsWith(".test-data-tls-")
  )
    throw new Error("Unexpected TLS fixture cleanup path");
  await rm(directory, { recursive: true, force: true });
});

it("conserva los parámetros del driver cuando no se configura una CA", () => {
  expect(
    postgresConfig({ DATABASE_URL: fixtureURL + "?sslmode=verify-full" }),
  ).toMatchObject({
    connectionString: fixtureURL + "?sslmode=verify-full",
    connectionTimeoutMillis: 15000,
  });
  expect(() => postgresConfig({})).toThrow("Falta DATABASE_URL");
});

it("usa la CA pública incluida solo en hosts PostgreSQL de Supabase", () => {
  for (const host of [
    "aws-0-eu-west-1.pooler.supabase.com",
    "db.fixture.supabase.co",
  ]) {
    const config = postgresConfig({
      DATABASE_URL: `postgresql://fixture:fixture-only@${host}:5432/postgres?sslmode=require`,
    });
    const ssl = config.ssl as tls.ConnectionOptions;
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(new X509Certificate(ssl.ca as string).fingerprint256).toBe(
      "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
    );
    expect(new Client(config).ssl).toEqual(ssl);
  }
  const other = postgresConfig({
    DATABASE_URL:
      "postgresql://fixture:fixture-only@aws-0-eu-west-1.pooler.supabase.com.example.test/postgres?sslmode=verify-full",
  });
  expect(other.ssl).toBeUndefined();
});

it("rechaza contenido inválido y combinaciones ambiguas sin exponer valores", () => {
  expect(() =>
    postgresConfig({ DATABASE_URL: fixtureURL, DATABASE_SSL_CA: "invalid" }),
  ).toThrow("certificado CA PostgreSQL");
  expect(() =>
    postgresConfig({
      DATABASE_URL: "not-a-url-fixture-only",
      DATABASE_SSL_CA: ca,
    }),
  ).toThrow(/^DATABASE_URL debe/);
  expect(() =>
    postgresConfig({ DATABASE_URL: fixtureURL, DATABASE_SSL_CA: key }),
  ).toThrow("certificado CA PostgreSQL");
  expect(() =>
    postgresConfig({
      DATABASE_URL: fixtureURL + "?sslkey=fixture-only",
      DATABASE_SSL_CA: ca,
    }),
  ).toThrow("no se combina");
});

it("pg conserva la CA explícita, la contraseña codificada y la verificación estricta", () => {
  const config = postgresConfig({
    DATABASE_URL:
      "postgresql://fixture:p%40ss%23@localhost:5432/postgres?sslmode=require&sslrootcert=missing-fixture.crt&uselibpqcompat=true&application_name=pixvo",
    DATABASE_SSL_CA: ca.replaceAll("\n", "\\n"),
  });
  expect(config.ssl).toEqual({ ca: ca.trim(), rejectUnauthorized: true });
  const parsed = new URL(config.connectionString!);
  expect(parsed.password).toBe("p%40ss%23");
  expect(parsed.searchParams.get("application_name")).toBe("pixvo");
  expect(parsed.searchParams.has("sslmode")).toBe(false);
  const client = new Client(config);
  expect(client.ssl).toEqual(config.ssl);
});

it("la CA permite TLS real y sigue rechazando certificados desconocidos y nombres incorrectos", async () => {
  const context = tls.createSecureContext({ key, cert: certificate + ca });
  const request = Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]);
  // Same PostgreSQL SSLRequest negotiation used by pg before its TLS handshake.
  const server = net.createServer((socket) => {
    socket.once("data", (data) => {
      if (!data.equals(request)) {
        socket.destroy();
        return;
      }
      socket.write("S");
      const encrypted = new tls.TLSSocket(socket, {
        isServer: true,
        secureContext: context,
      });
      encrypted.once("secure", () => encrypted.end());
      encrypted.on("error", () => {});
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing fixture port");
  const ssl = postgresConfig({ DATABASE_URL: fixtureURL, DATABASE_SSL_CA: ca })
    .ssl as tls.ConnectionOptions;
  const connect = (options: tls.ConnectionOptions) =>
    new Promise<boolean>((resolve, reject) => {
      const socket = net.connect({ host: "127.0.0.1", port: address.port });
      socket.once("connect", () => socket.write(request));
      socket.setTimeout(5000, () =>
        socket.destroy(new Error("TLS fixture timeout")),
      );
      socket.once("data", (data) => {
        if (data[0] !== 83) {
          socket.destroy();
          reject(new Error("Missing SSL acknowledgement"));
          return;
        }
        const encrypted = tls.connect({
          socket,
          servername: "localhost",
          ...options,
        });
        encrypted.once("error", reject);
        encrypted.once("secureConnect", () => {
          resolve(encrypted.authorized);
          encrypted.end();
        });
      });
      socket.once("error", reject);
    });
  try {
    await expect(connect(ssl)).resolves.toBe(true);
    await expect(connect({ rejectUnauthorized: true })).rejects.toMatchObject({
      code: "SELF_SIGNED_CERT_IN_CHAIN",
    });
    await expect(
      connect({ ...ssl, servername: "wrong.example.test" }),
    ).rejects.toMatchObject({ code: "ERR_TLS_CERT_ALTNAME_INVALID" });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
