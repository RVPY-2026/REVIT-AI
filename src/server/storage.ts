import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/server/env";

/**
 * Reads one object from a private Storage bucket with the secret key. Callers decide who may see
 * the file first (BACKEND_RULES §4); the bucket and path never reach the browser.
 */
export async function downloadPrivateObject(bucket: string, objectPath: string): Promise<Blob | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !serverEnv.SUPABASE_SECRET_KEY) return null;
  const storage = createClient(url, serverEnv.SUPABASE_SECRET_KEY, { auth: { persistSession: false } }).storage;
  const { data, error } = await storage.from(bucket).download(objectPath);
  return error ? null : data;
}
