import { Suspense } from "react";
import { Header, Eyebrow } from "./ui";
import { AuthForm } from "./auth";
import { configured, localMode } from "@/server/db";
export function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "recover" | "password";
}) {
  return (
    <>
      <Header />
      <main className="auth-page">
        <div className="auth-story">
          <Eyebrow>Lo especial empieza acá</Eyebrow>
          <h1>
            Un encuentro.
            <br />
            Tu gente.
            <br />
            <em>Tu historia.</em>
          </h1>
          <p>
            Guardá tus ideas, encontrá tu estilo y prepará una invitación con
            todo lo que hace único a tu momento.
          </p>
        </div>
        <Suspense fallback={<p>Cargando…</p>}>
          <AuthForm mode={mode} local={localMode()} configured={configured()} />
        </Suspense>
      </main>
    </>
  );
}
