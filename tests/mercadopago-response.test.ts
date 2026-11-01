import { z } from "zod";
import { expect, it, vi } from "vitest";
import { parseCheckoutResponse } from "../src/server/mercadopago-response";

it("descarta datos ajenos al contrato y no registra respuestas válidas", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(
      parseCheckoutResponse(
        z.object({ id: z.string(), checkout_url: z.url() }),
        {
          id: "ORDTEST",
          checkout_url: "https://www.mercadopago.com.ar/checkout/",
          client_token: "test-only-secret",
          last_updated_date: null,
        },
        "create_checkout",
      ),
    ).toEqual({
      id: "ORDTEST",
      checkout_url: "https://www.mercadopago.com.ar/checkout/",
    });
    expect(log).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

it("diagnostica campos incompatibles sin valores, tokens, URLs ni mensajes Zod", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    let failure: unknown;
    try {
      parseCheckoutResponse(
        z.object({ id: z.string(), checkout_url: z.url() }),
        {
          id: { secret: "test-only-private-account" },
          checkout_url: "test-only-private-url",
          client_token: "test-only-private-token",
        },
        "create_checkout",
      );
    } catch (e) {
      failure = e;
    }
    expect(failure).toMatchObject({
      status: 503,
      message: "Respuesta de checkout incompatible (id, checkout_url)",
    });
    const line = String(log.mock.calls[0][0]);
    expect(JSON.parse(line.slice(line.indexOf("{")))).toEqual({
      stage: "create_checkout",
      issues: [
        { field: "id", code: "invalid_type" },
        { field: "checkout_url", code: "invalid_format" },
      ],
    });
    expect(line).not.toMatch(/test-only-private|client_token|Authorization/);
  } finally {
    log.mockRestore();
  }
});

it("limita diagnósticos a nombres conocidos y distingue la consulta de verificación", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(() =>
      parseCheckoutResponse(
        z.object({ "test-only-private-field": z.string() }),
        {},
        "verify_checkout",
      ),
    ).toThrow("No se pudo verificar la orden de Mercado Pago (response)");
    expect(String(log.mock.calls[0][0])).not.toContain(
      "test-only-private-field",
    );
  } finally {
    log.mockRestore();
  }
});
