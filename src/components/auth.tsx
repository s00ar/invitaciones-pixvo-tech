"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Notice } from "./ui";
export async function api<T = Record<string, unknown>>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch(url, {
    method,
    ...(body instanceof FormData
      ? { body }
      : body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(
      new Error(data.error ?? "No se pudo completar la operación"),
      { status: r.status },
    );
  return data;
}
function Redirect() {
  const pathname = usePathname(),
    search = useSearchParams(),
    router = useRouter();
  useEffect(() => {
    router.replace(
      `/login?next=${encodeURIComponent(pathname + (search.size ? "?" + search.toString() : ""))}`,
    );
  }, [pathname, search, router]);
  return <p className="empty-state">Abriendo acceso seguro…</p>;
}
export function LoginRedirect() {
  return (
    <Suspense>
      <Redirect />
    </Suspense>
  );
}
export function AuthForm({
  mode,
  local,
  configured,
}: {
  mode: "login" | "register" | "recover" | "password";
  local: boolean;
  configured: boolean;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const next = params.get("next") ?? "/app";
  return (
    <div className="auth-panel">
      <h2>
        {mode === "register"
          ? "Tu historia empieza acá."
          : mode === "recover"
            ? "Recuperá tu acceso."
            : mode === "password"
              ? "Elegí una nueva clave."
              : "Qué bueno verte."}
      </h2>
      <p>
        {mode === "register"
          ? "Creá tu cuenta y guardá cada detalle."
          : mode === "recover"
            ? "Te enviaremos las instrucciones por email."
            : mode === "password"
              ? "Usá al menos 10 caracteres."
              : "Entrá para seguir preparando tu gran momento."}
      </p>
      {!configured && (
        <Notice>
          Configuración pendiente: conectá Supabase para habilitar cuentas o
          iniciá el modo local de desarrollo.
        </Notice>
      )}
      {local && (
        <Notice>
          Entorno local de desarrollo. Las cuentas se guardan en este equipo; el
          correo y los pagos externos requieren configuración.
        </Notice>
      )}
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const f = new FormData(e.currentTarget);
          try {
            const data = await api<{
              next: string;
              needsConfirmation: boolean;
              message?: string;
            }>(
              `/api/auth/${mode === "password" ? "password" : mode === "recover" ? "recover" : mode === "register" ? "register" : "login"}`,
              "POST",
              mode === "recover"
                ? { email: f.get("email") }
                : mode === "password"
                  ? { password: f.get("password") }
                  : {
                      email: f.get("email"),
                      password: f.get("password"),
                      next,
                    },
            );
            setError(false);
            if (mode === "recover" || mode === "password")
              setMessage(data.message ?? "Solicitud recibida");
            else if (data.needsConfirmation)
              setMessage(
                "Revisá tu email para confirmar la cuenta. Tu selección se conserva en el enlace de confirmación.",
              );
            else {
              router.push(data.next);
              router.refresh();
            }
          } catch (err) {
            setError(true);
            setMessage(
              err instanceof Error
                ? err.message
                : "No se pudo completar la solicitud",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode !== "password" && (
          <label className="field">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
        )}
        {mode !== "recover" && (
          <label className="field">
            Contraseña
            <input
              name="password"
              aria-label="Contraseña"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={10}
              maxLength={128}
            />
            <small>Al menos 10 caracteres.</small>
          </label>
        )}
        <button className="button primary" disabled={busy || !configured}>
          {busy
            ? "Un momento…"
            : mode === "register"
              ? "Crear cuenta"
              : mode === "recover"
                ? "Enviar instrucciones"
                : mode === "password"
                  ? "Guardar contraseña"
                  : "Iniciar sesión"}
          <ArrowRight size={16} />
        </button>
      </form>
      {mode === "login" && configured && !local && (
        <button
          className="button ghost"
          style={{ marginTop: 12 }}
          onClick={async () => {
            try {
              const d = await api<{ url: string }>("/api/auth/google", "POST", {
                next,
              });
              window.location.assign(d.url);
            } catch (e) {
              setError(true);
              setMessage((e as Error).message);
            }
          }}
        >
          Continuar con Google
        </button>
      )}
      {message && <Notice error={error}>{message}</Notice>}
      <div className="auth-links">
        <Link
          href={`${mode === "register" ? "/login" : "/registro"}?next=${encodeURIComponent(next)}`}
        >
          {mode === "register" ? "Ya tengo cuenta" : "Crear cuenta"}
        </Link>
        <Link href="/recuperar">Olvidé mi contraseña</Link>
      </div>
    </div>
  );
}
export function Logout() {
  const router = useRouter();
  return (
    <button
      className="button small ghost"
      onClick={async () => {
        try {
          await api("/api/auth/logout", "POST", {});
          router.replace("/");
          router.refresh();
        } catch {
          window.location.reload();
        }
      }}
    >
      Cerrar sesión
    </button>
  );
}
