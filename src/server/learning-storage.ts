import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/server/env";
import { RESOURCE_BUCKET } from "@/server/learning-upload-config";

export function learningStorage() {
  if (!serverEnv.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Storage is not configured");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
}
export async function removeLearningObject(object: { bucket: string; path: string } | null): Promise<boolean> {
  if (!object) return true;
  try { const { error } = await learningStorage().from(object.bucket).remove([object.path]); return !error; } catch { return false; }
}
export async function ensureLearningBucket() {
  const storage = learningStorage();
  let bucket = await storage.getBucket(RESOURCE_BUCKET);
  if (bucket.error) {
    const created = await storage.createBucket(RESOURCE_BUCKET, { public: false, fileSizeLimit: 100 * 1024 * 1024 });
    if (created.error) throw new Error("Could not create private learning bucket");
    bucket = await storage.getBucket(RESOURCE_BUCKET);
  }
  if (bucket.error || bucket.data.public) throw new Error("A private learning bucket is required");
}
/** Upload bytes are counted by the server, never accepted from client metadata alone. */
export async function streamLearningObject(path: string, contentType: string, expectedSize: number, body: ReadableStream<Uint8Array>, signal: AbortSignal) {
  if (!serverEnv.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Storage is not configured");
  const bucket = await learningStorage().getBucket(RESOURCE_BUCKET);
  if (bucket.error || bucket.data.public) throw new Error("A private learning bucket is required");
  let received = 0;
  const counted = body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > expectedSize) throw new Error("Upload exceeds reservation");
      controller.enqueue(chunk);
    },
    flush() { if (received !== expectedSize) throw new Error("Upload size mismatch"); },
  }));
  const url = new URL(`/storage/v1/object/${RESOURCE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`, process.env.NEXT_PUBLIC_SUPABASE_URL);
  const options = { method: "POST", headers: { Authorization: `Bearer ${serverEnv.SUPABASE_SECRET_KEY}`, apikey: serverEnv.SUPABASE_SECRET_KEY, "Content-Type": contentType, "x-upsert": "false" }, body: counted, signal, duplex: "half" };
  const response = await fetch(url, options as RequestInit);
  if (!response.ok) throw new Error("Storage upload failed");
  const { data, error } = await learningStorage().from(RESOURCE_BUCKET).info(path);
  if (error || Number(data?.size) !== expectedSize || data?.contentType !== contentType) throw new Error("Stored upload does not match reservation");
}
