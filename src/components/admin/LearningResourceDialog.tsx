"use client";
import { useLearningResourceUpload } from "./useLearningResourceUpload";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LearningSelect } from "./LearningSelect";
import { AUDIENCE_LABELS, normalizeYoutube } from "@/lib/learning-content";
import {
  resourceSchema,
  type ManagedLesson,
  type ManagedResource,
} from "@/lib/schemas/learning-content";
import { saveResource } from "@/server/actions/learning-content";

export function LearningResourceDialog({
  resource,
  lessons,
  preview,
  onClose,
}: {
  resource: ManagedResource | null;
  lessons: ManagedLesson[];
  preview: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      id: resource?.id,
      title: resource?.title ?? "",
      lessonId: resource?.lessonId ?? null,
      audience: resource?.audience ?? "formal",
      mode: resource?.mode ?? "view",
      active: resource?.active ?? true,
      source: resource?.format === "youtube" ? "youtube" : "file",
      youtubeUrl: resource?.youtubeUrl ?? "",
    },
  });
  const values = useWatch({ control: form.control });
  const source = values.source ?? "file";
  const mode = values.mode ?? "view";
  const youtube = normalizeYoutube(values.youtubeUrl ?? "");
  const errors = form.formState.errors;
  const uploadState = useLearningResourceUpload((id) =>
    form.setValue("uploadId", id, { shouldValidate: true }),
  );
  const {
    file,
    setFile,
    progress,
    uploading,
    error: uploadError,
    cancel,
  } = uploadState;
  async function close() {
    if (!pending) {
      await cancel();
      onClose();
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
    >
      <DialogContent className="[&>button]:size-11 max-sm:content-start max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
        <DialogHeader>
          <DialogTitle>
            {resource ? "Sửa tài liệu" : "Thêm tài liệu"}
          </DialogTitle>
          <DialogDescription>
            {resource
              ? "Thay tệp vẫn giữ nguyên liên kết của học viên."
              : "Chọn tệp hoặc video để học viên xem."}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid content-start gap-4"
          onSubmit={(event) => {
            void form.handleSubmit(
              (data) =>
                start(async () => {
                  if (
                    data.source === "file" &&
                    !data.uploadId &&
                    (file || resource?.format === "youtube")
                  ) {
                    form.setError("uploadId", {
                      message: "Bạn tải tệp lên trước khi lưu.",
                    });
                    document.getElementById("resource-file-picker")?.focus();
                    return;
                  }
                  const result = await saveResource(data);
                  if (!result.ok) {
                    form.setError("root", { message: result.error });
                    return;
                  }
                  uploadState.consume();
                  toast.success(`Đã lưu tài liệu ${data.title}`);
                  if (result.data.cleanupPending)
                    toast.error(
                      "Đã lưu tài liệu, tệp cũ chưa được dọn. Bạn báo quản trị viên nhé.",
                    );
                  router.refresh();
                  onClose();
                }),
              (invalid) => {
                if (invalid.uploadId && !invalid.title)
                  document.getElementById("resource-file-picker")?.focus();
              },
            )(event);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="resource-title">Tên tài liệu</Label>
            <Input
              id="resource-title"
              {...form.register("title")}
              aria-invalid={!!errors.title}
              aria-describedby="resource-title-error"
            />
            <p id="resource-title-error" className="text-sm text-destructive">
              {errors.title?.message}
            </p>
          </div>
          <LearningSelect
            id="resource-source"
            label="Nguồn tài liệu"
            value={source}
            disabled={uploading}
            options={[
              { value: "file", label: "Tải tệp lên" },
              { value: "youtube", label: "Video YouTube" },
            ]}
            onChange={(value) => {
              void cancel();
              form.setValue("source", value as "file" | "youtube");
              if (value === "youtube") form.setValue("mode", "view");
            }}
          />
          {source === "youtube" ? (
            <div className="grid gap-2">
              <Label htmlFor="resource-youtube">Đường dẫn YouTube</Label>
              <Input
                id="resource-youtube"
                type="url"
                inputMode="url"
                {...form.register("youtubeUrl")}
                aria-invalid={!!errors.youtubeUrl}
              />
              <p className="text-sm text-destructive">
                {errors.youtubeUrl?.message}
              </p>
              {youtube && (
                <p className="break-all font-mono text-xs text-muted-foreground">
                  Mã video: {youtube.split("/").pop()}
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="resource-file-picker">Tệp tài liệu</Label>
              <Button
                id="resource-file-picker"
                type="button"
                variant="outline"
                className="min-h-11 justify-start"
                disabled={uploading}
                onClick={() =>
                  document.getElementById("resource-file")?.click()
                }
              >
                Chọn tệp tài liệu
              </Button>
              <input
                id="resource-file"
                type="file"
                className="hidden"
                aria-label="Chọn tệp tài liệu"
                disabled={uploading}
                accept={
                  mode === "view"
                    ? ".pdf,.png,.jpg,.jpeg,.webp"
                    : ".pdf,.png,.jpg,.jpeg,.webp,.exe,.msi,.zip,.rvt,.rfa"
                }
                onChange={(event) => {
                  void cancel();
                  setFile(event.target.files?.[0] ?? null);
                }}
              />
              {file && (
                <p className="break-words text-sm" title={file.name}>
                  {file.name}
                </p>
              )}
              <p className="break-words text-xs text-muted-foreground">
                {resource?.filename && !file
                  ? `Tệp hiện tại: ${resource.filename}. `
                  : ""}
                {mode === "view"
                  ? "PDF, PNG, JPG, WebP; tối đa 25 MB."
                  : "PDF, ảnh, EXE, MSI, ZIP, RVT, RFA; tối đa 50 MB. Tệp cài đặt lớn hơn chưa được hỗ trợ."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void uploadState.upload(mode)}
                  disabled={preview || uploading || pending}
                >
                  {uploadError ? "Thử tải lại tệp" : "Tải tệp lên"}
                </Button>
                {uploading && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void cancel()}
                  >
                    Hủy tải tệp
                  </Button>
                )}
              </div>
              {(uploading || progress > 0) && (
                <div aria-live="polite">
                  <progress
                    className="w-full accent-primary"
                    value={progress}
                    max={100}
                    aria-label="Tiến độ tải tệp"
                  />
                  <p className="text-xs">
                    {uploading ? `Đang tải ${progress}%` : "Đã tải tệp lên"}
                  </p>
                </div>
              )}
              <p className="text-sm text-destructive" role="status">
                {uploadError || errors.uploadId?.message}
              </p>
            </div>
          )}
          <LearningSelect
            id="resource-lesson"
            label="Bài học"
            value={values.lessonId ?? "none"}
            options={[
              { value: "none", label: "Không gắn bài học" },
              ...lessons.map((l) => ({
                value: l.id,
                label: `${l.lessonNumbers.join("/")} · ${l.title}`,
              })),
            ]}
            onChange={(value) =>
              form.setValue("lessonId", value === "none" ? null : value)
            }
          />
          <LearningSelect
            id="resource-audience"
            label="Đối tượng"
            value={values.audience ?? "formal"}
            options={Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) =>
              form.setValue("audience", value as "all" | "formal" | "trial")
            }
          />
          <LearningSelect
            id="resource-mode"
            label="Cách sử dụng"
            value={mode}
            disabled={source === "youtube" || uploading}
            options={[
              { value: "view", label: "Chỉ xem" },
              { value: "download", label: "Cho tải" },
            ]}
            onChange={(value) => {
              void cancel();
              form.setValue("mode", value as "view" | "download");
            }}
          />
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              {...form.register("active")}
              className="size-5 accent-primary"
            />
            Đang dùng tài liệu
          </label>
          {preview && (
            <p className="text-sm text-muted-foreground">
              Chế độ xem thử chưa lưu thay đổi.
            </p>
          )}
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-destructive"
          >
            {errors.root?.message}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void close()}
            >
              Đóng hộp thoại
            </Button>
            <Button type="submit" disabled={pending || uploading || preview}>
              {pending ? "Đang lưu tài liệu…" : "Lưu tài liệu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
