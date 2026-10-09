import { createBrowserClient } from "@supabase/ssr";

/** Browser client — used only for sign-in and sign-out. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
