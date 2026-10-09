"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USE_MOCK, hasSupabaseConfig } from "@/lib/runtime-mode";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  if (USE_MOCK) (await cookies()).delete("rvpy-mock-role");
  else if (hasSupabaseConfig()) await (await createClient()).auth.signOut();
  redirect("/dang-nhap");
}
