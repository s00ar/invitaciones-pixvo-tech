export function safeNext(value: string | null | undefined) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/app";
  // URL parsers remove tabs/newlines, which can turn an apparent path into //host.
  const origin = "https://pixvo-auth.invalid";
  try {
    return new URL(value, origin).origin === origin ? value : "/app";
  } catch {
    return "/app";
  }
}

export function authCallbackUrl(
  appUrl: string | undefined,
  next?: string | null,
) {
  if (!appUrl) throw new Error("Configuración pendiente: NEXT_PUBLIC_APP_URL");
  const url = new URL("/auth/confirm", appUrl);
  url.searchParams.set("next", safeNext(next));
  return url.toString();
}
