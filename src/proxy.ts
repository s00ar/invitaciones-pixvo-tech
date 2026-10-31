import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (
    process.env.PIXVO_LOCAL_DEV === "1" &&
    process.env.NODE_ENV !== "production"
  )
    return response;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return response;
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          for (const c of values) request.cookies.set(c.name, c.value);
          response = NextResponse.next({ request });
          for (const c of values)
            response.cookies.set(c.name, c.value, c.options);
        },
      },
    },
  );
  await client.auth.getClaims();
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand|assets|fonts).*)"],
};
