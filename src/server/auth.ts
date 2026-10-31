import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { localMode, transaction, configured } from "./db";
import { fail } from "./errors";
export type User = {
  id: string;
  email: string;
  role: string;
  displayName: string;
};
export const hashToken = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export function safeNext(value: string | null | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/app";
}
export async function supabase() {
  const jar = await cookies();
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    fail(503, "Configuración pendiente: Supabase Auth");
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            for (const c of values) jar.set(c.name, c.value, c.options);
          } catch {
            /* RSC cannot refresh cookies; mutation endpoints can. */
          }
        },
      },
    },
  );
}
export async function currentUser(): Promise<User | null> {
  if (!configured()) return null;
  let id: string | undefined,
    email = "";
  if (localMode()) {
    const t = (await cookies()).get("pixvo_session")?.value;
    if (!t) return null;
    const row = await transaction(
      async (db) =>
        (
          await db.query<{ id: string; email: string }>(
            "select u.id,u.email from local_dev.sessions s join auth.users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now()",
            [hashToken(t)],
          )
        ).rows[0],
    );
    if (!row) return null;
    id = row.id;
    email = row.email;
  } else {
    const {
      data: { user },
    } = await (await supabase()).auth.getUser();
    if (!user) return null;
    id = user.id;
    email = user.email ?? "";
  }
  return transaction(async (db) => {
    await db.query(
      "insert into profiles(id) values($1) on conflict(id) do nothing",
      [id],
    );
    const p = (
      await db.query<{ role: string; display_name: string }>(
        "select role,display_name from profiles where id=$1",
        [id],
      )
    ).rows[0];
    return { id: id!, email, role: p.role, displayName: p.display_name };
  });
}
export async function requireUser() {
  return (await currentUser()) ?? fail(401, "Iniciá sesión para continuar");
}
export async function authenticate(
  email: string,
  password: string,
  register = false,
  next = "/app",
) {
  const jar = await cookies();
  if (!localMode()) {
    const s = await supabase();
    const result = register
      ? await s.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=${encodeURIComponent(safeNext(next))}`,
          },
        })
      : await s.auth.signInWithPassword({ email, password });
    if (result.error)
      fail(
        400,
        "No se pudo iniciar sesión. Revisá los datos y el correo de confirmación.",
      );
    return { needsConfirmation: !result.data.session };
  }
  const session = token();
  await transaction(async (db) => {
    let row = (
      await db.query<{ id: string; password_hash: string }>(
        "select id,password_hash from local_dev.users where email=$1",
        [email],
      )
    ).rows[0];
    if (register) {
      if (row) fail(400, "No se pudo crear la cuenta con esos datos");
      const id = randomUUID(),
        salt = randomBytes(16).toString("hex"),
        digest = scryptSync(password, salt, 64).toString("hex");
      await db.query("insert into auth.users(id,email) values($1,$2)", [
        id,
        email,
      ]);
      await db.query(
        "insert into local_dev.users(id,email,password_hash) values($1,$2,$3)",
        [id, email, `${salt}:${digest}`],
      );
      await db.query("insert into profiles(id) values($1)", [id]);
      row = { id, password_hash: `${salt}:${digest}` };
    } else {
      const [salt, stored] = (
        row?.password_hash ?? "0000000000000000:" + "0".repeat(128)
      ).split(":");
      const digest = scryptSync(password, salt, 64);
      if (!row || !timingSafeEqual(digest, Buffer.from(stored, "hex")))
        fail(401, "Email o contraseña incorrectos");
    }
    await db.query(
      "insert into local_dev.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '7 days')",
      [hashToken(session), row.id],
    );
  });
  jar.set("pixvo_session", session, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 604800,
  });
  return { needsConfirmation: false };
}
export async function signOut() {
  if (localMode()) {
    const jar = await cookies();
    const t = jar.get("pixvo_session")?.value;
    if (t)
      await transaction((db) =>
        db.query("delete from local_dev.sessions where token_hash=$1", [
          hashToken(t),
        ]),
      );
    jar.delete("pixvo_session");
  } else await (await supabase()).auth.signOut();
}
