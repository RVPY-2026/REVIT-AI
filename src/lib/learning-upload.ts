"use client";

import { createClient } from "@supabase/supabase-js";

type SignedDestination = { bucket: string; path: string; token: string };

/** Official signed-upload API with an XHR fetch adapter for progress and cancellation. */
export async function uploadLearningFile(
  destination: SignedDestination,
  file: File,
  signal: AbortSignal,
  onProgress: (percent: number) => void,
) {
  const uploadFetch: typeof fetch = async (input, options) =>
    new Promise<Response>((resolve, reject) => {
      const request = new XMLHttpRequest();
      const abort = () => request.abort();
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      request.open(options?.method ?? "PUT", String(input));
      new Headers(options?.headers).forEach((value, name) =>
        request.setRequestHeader(name, value),
      );
      request.upload.onprogress = (event) => {
        if (event.lengthComputable)
          onProgress(Math.round((event.loaded / event.total) * 100));
      };
      request.onload = () =>
        resolve(new Response(request.responseText, { status: request.status }));
      request.onerror = () =>
        reject(new Error("Kết nối bị gián đoạn. Bạn thử tải lại tệp."));
      request.onabort = () => reject(new DOMException("Aborted", "AbortError"));
      request.onloadend = () => signal.removeEventListener("abort", abort);
      signal.addEventListener("abort", abort, { once: true });
      request.send(options?.body as XMLHttpRequestBodyInit);
    });
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: uploadFetch },
    },
  );
  const { error } = await client.storage
    .from(destination.bucket)
    .uploadToSignedUrl(destination.path, destination.token, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error)
    throw new Error(
      signal.aborted
        ? "Đã hủy tải tệp. Bạn có thể thử lại."
        : "Chưa tải được tệp. Bạn thử tải lại.",
    );
}
