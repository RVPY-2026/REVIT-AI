import { createBrowserClient } from "@supabase/ssr";

/** Browser client — used only to start Google sign-in and to sign out. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
