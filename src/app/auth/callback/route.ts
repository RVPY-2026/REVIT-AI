import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAreaPath } from "@/lib/auth/redirect";
import { USE_MOCK, hasSupabaseConfig } from "@/lib/runtime-mode";
import { getCurrentUser } from "@/server/auth/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && !USE_MOCK && hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const user = await getCurrentUser();
        const path = user?.roles.length
          ? safeAreaPath(user, request.nextUrl.searchParams.get("next"))
          : "/chua-kich-hoat";
        return NextResponse.redirect(new URL(path, request.nextUrl.origin), {
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    } catch {
      // Do not expose provider tokens, email or database errors in the callback.
    }
  }
  return NextResponse.redirect(
    new URL("/dang-nhap?error=oauth", request.nextUrl.origin),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
