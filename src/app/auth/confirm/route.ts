import { NextResponse } from "next/server";
import { supabase, safeNext } from "@/server/auth";
import type { EmailOtpType } from "@supabase/supabase-js";
export async function GET(request: Request) {
  const url = new URL(request.url),
    s = await supabase(),
    code = url.searchParams.get("code"),
    hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  let ok = false;
  if (code) ok = !(await s.auth.exchangeCodeForSession(code)).error;
  else if (
    hash &&
    ["signup", "recovery", "email", "invite"].includes(type ?? "")
  )
    ok = !(
      await s.auth.verifyOtp({ token_hash: hash, type: type as EmailOtpType })
    ).error;
  return NextResponse.redirect(
    new URL(
      ok ? safeNext(url.searchParams.get("next")) : "/login?error=confirmation",
      process.env.NEXT_PUBLIC_APP_URL ?? url.origin,
    ),
  );
}
