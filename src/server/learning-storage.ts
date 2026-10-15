import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/server/env";
import { DOWNLOAD_LIMIT, UPLOAD_MIME_TYPES } from "@/lib/learning-content";
import { RESOURCE_BUCKET } from "@/server/learning-upload-config";

export function learningStorage() {
  if (!serverEnv.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error("Storage is not configured");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  ).storage;
}

export async function removeLearningObject(
  object: { bucket: string; path: string } | null,
): Promise<boolean> {
  if (!object) return true;
  try {
    const { error } = await learningStorage()
      .from(object.bucket)
      .remove([object.path]);
    return !error;
  } catch {
    return false;
  }
}

export async function ensureLearningBucket() {
  const storage = learningStorage();
  const bucket = await storage.getBucket(RESOURCE_BUCKET);
  const restrictions = {
    public: false,
    fileSizeLimit: DOWNLOAD_LIMIT,
    allowedMimeTypes: [...UPLOAD_MIME_TYPES],
  };
  if (bucket.error) {
    const created = await storage.createBucket(RESOURCE_BUCKET, restrictions);
    if (created.error)
      throw new Error("Could not create private learning bucket");
  } else {
    if (bucket.data.public)
      throw new Error("A private learning bucket is required");
    const updated = await storage.updateBucket(RESOURCE_BUCKET, restrictions);
    if (updated.error)
      throw new Error("Could not enforce learning bucket restrictions");
  }
}

/** Signed destinations are disclosed only to the authorized admin uploader. */
export async function signLearningUpload(path: string) {
  const { data, error } = await learningStorage()
    .from(RESOURCE_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error) throw new Error("Could not sign learning upload");
  return {
    bucket: RESOURCE_BUCKET,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

export async function learningObjectInfo(path: string) {
  const { data, error } = await learningStorage()
    .from(RESOURCE_BUCKET)
    .info(path);
  if (error) throw new Error("Could not inspect stored upload");
  return { size: Number(data.size), contentType: data.contentType };
}
