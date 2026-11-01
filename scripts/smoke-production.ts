import { mkdir, writeFile } from "node:fs/promises";
import { templates } from "../src/domain/document";
import { customSamples } from "../src/domain/custom-samples";

const base = new URL(
  process.env.PIXVO_SMOKE_BASE_URL ?? "https://invitaciones.pixvo.tech",
);
if (
  base.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(base.hostname)
)
  throw new Error("La prueba requiere HTTPS o un servidor local");
type Check = {
  path: string;
  method?: string;
  expected: number;
  verify?: (response: Response, body: string) => void;
  body?: object;
  headers?: Record<string, string>;
};
const assert = (valid: unknown, message: string) => {
  if (!valid) throw new Error(message);
};
const checks: Check[] = [
  ...[
    "/",
    "/templates",
    "/precios",
    "/personalizadas",
    "/login",
    "/registro",
    "/recuperar",
    "/privacidad",
    ...templates.map((t) => `/preview/${t.id}`),
    ...customSamples.map((s) => `/personalizadas/${s.slug}`),
  ].map((path) => ({
    path,
    expected: 200,
    verify: (r: Response, body: string) => {
      assert(
        !body.includes("No pudimos cargar esta página"),
        "Página de error en respuesta 200",
      );
      assert(
        r.headers.get("x-content-type-options") === "nosniff",
        "Falta nosniff",
      );
      assert(
        r.headers.get("x-frame-options") === "DENY",
        "Falta protección de iframe",
      );
    },
  })),
  {
    path: "/api/templates",
    expected: 200,
    verify: (_, b) =>
      assert(JSON.parse(b).length === 27, "Catálogo incompleto"),
  },
  {
    path: "/api/plans",
    expected: 200,
    verify: (_, b) => {
      const plans = JSON.parse(b);
      for (const [id, amount] of [
        ["standard", 3500000],
        ["premium", 6000000],
        ["custom", 10000000],
      ])
        assert(
          plans.some(
            (p: { id: string; currency: string; price_minor: number }) =>
              p.id === id && p.currency === "ARS" && p.price_minor === amount,
          ),
          "Precio/moneda distintos de la referencia comercial",
        );
    },
  },
  ...["/api/invitations", "/api/orders", "/api/admin"].map((path) => ({
    path,
    expected: 401,
  })),
  { path: "/api/media/00000000-0000-4000-8000-000000000000", expected: 404 },
  { path: "/api/public/qa-no-existe", expected: 404 },
  { path: "/i/qa-no-existe", expected: 404 },
  { path: "/preview/qa-no-existe", expected: 404 },
  {
    path: "/icon.png",
    expected: 200,
    verify: (r) =>
      assert(
        r.headers.get("content-type")?.includes("image/png"),
        "Favicon no es PNG",
      ),
  },
  { path: "/favicon.ico", expected: 200 },
  // These fail before any record/provider mutation; no login, emails or payments.
  {
    path: "/api/invitations",
    method: "POST",
    expected: 401,
    body: { templateId: "pixvo-free-xv" },
  },
  { path: "/api/orders", method: "POST", expected: 401, body: {} },
  {
    path: "/api/webhooks/mercadopago",
    method: "POST",
    expected: 401,
    body: {},
  },
  {
    path: "/api/invitations",
    method: "POST",
    expected: 403,
    body: {},
    headers: { Origin: "https://qa-invalid.example" },
  },
];
const results = [];
for (const check of checks) {
  const start = performance.now();
  try {
    const response = await fetch(new URL(check.path, base.origin), {
      method: check.method ?? "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
      headers: {
        ...(check.body ? { "Content-Type": "application/json" } : {}),
        ...check.headers,
      },
      ...(check.body ? { body: JSON.stringify(check.body) } : {}),
    });
    const body = await response.text();
    assert(
      response.status === check.expected,
      `HTTP ${response.status}; esperado ${check.expected}`,
    );
    check.verify?.(response, body);
    results.push({
      path: check.path,
      method: check.method ?? "GET",
      status: response.status,
      ok: true,
      ms: Math.round(performance.now() - start),
    });
  } catch (e) {
    results.push({
      path: check.path,
      method: check.method ?? "GET",
      ok: false,
      error: e instanceof Error ? e.message : "Error de comprobación",
      ms: Math.round(performance.now() - start),
    });
  }
}
await mkdir(".data", { recursive: true });
await writeFile(
  ".data/production-smoke.json",
  JSON.stringify(
    { origin: base.origin, date: new Date().toISOString(), results },
    null,
    2,
  ),
);
const failed = results.filter((r) => !r.ok);
console.log(
  JSON.stringify(
    { total: results.length, passed: results.length - failed.length, failed },
    null,
    2,
  ),
);
if (failed.length) process.exitCode = 1;
