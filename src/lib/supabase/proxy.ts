import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/quan-tri", "/hoc-vien"];

/**
 * Refreshes the Supabase session cookie on every request and bounces signed-out
 * visitors away from the app areas. This is an optimistic check only — role
 * checks happen in layouts and in src/server (BACKEND_RULES §4).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Mock mode has no Supabase project; the mock role cookie is read in src/server/auth/session.ts.
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Do not put code between createServerClient and getClaims() (Supabase docs).
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  if (!data?.claims && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
