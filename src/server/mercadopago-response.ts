import { z } from "zod";
import { fail } from "./errors";

const safeFields = new Set([
  "id",
  "checkout_url",
  "type",
  "processing_mode",
  "external_reference",
  "user_id",
  "currency",
  "total_amount",
]);

// Only field names from our fixed checkout schemas reach diagnostics. Never log
// Zod errors, provider bodies, client_token, checkout query strings or values.
export function parseCheckoutResponse<T>(
  schema: z.ZodType<T>,
  input: unknown,
  stage: "create_checkout" | "verify_checkout",
): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.slice(0, 8).map((issue) => ({
    field: safeFields.has(String(issue.path[0]))
      ? String(issue.path[0])
      : "response",
    code: issue.code,
  }));
  console.error(
    "pixvo.mercadopago.invalid_response " + JSON.stringify({ stage, issues }),
  );
  const fields = [...new Set(issues.map((issue) => issue.field))].join(", ");
  fail(
    503,
    `${stage === "create_checkout" ? "Respuesta de checkout incompatible" : "No se pudo verificar la orden de Mercado Pago"} (${fields})`,
  );
}
