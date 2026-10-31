import { expect, it } from "vitest";
import { createServerClient } from "@supabase/ssr";
import { authCallbackUrl } from "../src/server/auth-redirect";

it("keeps the same callback and selected invitation with or without a trailing slash", () => {
  const next = "/app/invitaciones/nueva?template=pixvo-free-xv&sample=romantica";
  for (const base of [
    "https://example.test",
    "https://example.test/",
    "https://example.test///",
  ]) {
    const callback = new URL(authCallbackUrl(base, next));
    expect(callback.origin).toBe("https://example.test");
    expect(callback.pathname).toBe("/auth/confirm");
    expect(callback.searchParams.get("next")).toBe(next);
  }
  const recovery = new URL(
    authCallbackUrl("https://example.test/", "/actualizar-clave"),
  );
  expect(recovery.pathname).toBe("/auth/confirm");
  expect(recovery.searchParams.get("next")).toBe("/actualizar-clave");
});

it("does not permit an external destination in an auth callback", () => {
  for (const next of [
    undefined,
    "https://other.example",
    "//other.example",
    "/\\other.example",
    "/\n/other.example",
    "/\t/other.example",
    "/\r/other.example",
  ]) {
    const callback = new URL(authCallbackUrl("https://example.test/", next));
    expect(callback.searchParams.get("next")).toBe("/app");
  }
  expect(() => authCallbackUrl(undefined)).toThrow("NEXT_PUBLIC_APP_URL");
});

it("generates a server PKCE Google URL with a canonical callback and verifier cookie", async () => {
  const savedCookies: { name: string; value: string }[] = [];
  const client = createServerClient(
    "https://fixture.supabase.co",
    "fixture-public-key",
    {
      cookies: {
        getAll: () => [],
        setAll: (cookies) => {
          savedCookies.push(...cookies);
        },
      },
    },
  );
  const redirectTo = authCallbackUrl(
    "https://example.test/",
    "/app/invitaciones/nueva?template=pixvo-free-xv",
  );
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  expect(error).toBeNull();
  const authorization = new URL(data.url!);
  expect(authorization.pathname).toBe("/auth/v1/authorize");
  expect(authorization.searchParams.get("redirect_to")).toBe(redirectTo);
  expect(authorization.searchParams.get("provider")).toBe("google");
  expect(authorization.searchParams.get("code_challenge_method")).toBe("s256");
  expect(authorization.searchParams.get("code_challenge")).toBeTruthy();
  expect(
    savedCookies.some((cookie) => cookie.name.endsWith("-code-verifier")),
  ).toBe(true);
});
