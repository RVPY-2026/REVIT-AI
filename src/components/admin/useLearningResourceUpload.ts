"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadLearningFile } from "@/lib/learning-upload";
import {
  cancelResourceUpload,
  completeResourceUpload,
  prepareResourceUpload,
} from "@/server/actions/learning-content";

export function useLearningResourceUpload(
  onUploadId: (id: string | undefined) => void,
) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const reservation = useRef<string | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function cancel() {
    controller.current?.abort();
    const id = reservation.current;
    reservation.current = null;
    onUploadId(undefined);
    if (id) {
      const result = await cancelResourceUpload({ id });
      if (!result.ok || result.data.cleanupPending)
        toast.error("Chưa dọn được tệp tạm. Bạn thử tải lại sau.");
    }
    setProgress(0);
  }

  async function upload(mode: "view" | "download") {
    if (!file) {
      setError("Bạn chọn tệp để tải lên.");
      document.getElementById("resource-file-picker")?.focus();
      return;
    }
    await cancel();
    const operation = new AbortController();
    controller.current = operation;
    setUploading(true);
    setError("");
    try {
      const prepared = await prepareResourceUpload({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        mode,
      });
      if (!prepared.ok) throw new Error(prepared.error);
      reservation.current = prepared.data.id;
      if (operation.signal.aborted)
        throw new Error("Đã hủy tải tệp. Bạn có thể thử lại.");
      await uploadLearningFile(
        prepared.data,
        file,
        operation.signal,
        setProgress,
      );
      if (operation.signal.aborted)
        throw new Error("Đã hủy tải tệp. Bạn có thể thử lại.");
      const completed = await completeResourceUpload({ id: prepared.data.id });
      if (!completed.ok) throw new Error(completed.error);
      if (operation.signal.aborted)
        throw new Error("Đã hủy tải tệp. Bạn có thể thử lại.");
      onUploadId(completed.data.id);
      setProgress(100);
    } catch (failure) {
      await cancel();
      setError(
        failure instanceof Error ? failure.message : "Bạn thử tải lại tệp.",
      );
    } finally {
      setUploading(false);
      controller.current = null;
    }
  }

  return {
    file,
    setFile,
    progress,
    uploading,
    error,
    cancel,
    upload,
    consume: () => {
      reservation.current = null;
    },
  };
}
