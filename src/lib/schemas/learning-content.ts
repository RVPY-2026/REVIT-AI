import { z } from "zod";
import { normalizeYoutube, validateUpload } from "@/lib/learning-content";
import { confirmTrialLessonSchema } from "./student-onboarding";

export const resourceSchema = z.object({
  id: z.uuid().optional(), title: z.string().trim().min(1, "Bạn nhập tên tài liệu.").max(200, "Tên tối đa 200 ký tự."),
  lessonId: z.uuid().nullable(), audience: z.enum(["trial", "formal", "all"]), mode: z.enum(["view", "download"]),
  active: z.boolean(), source: z.enum(["file", "youtube"]), youtubeUrl: z.string().max(1000), uploadId: z.uuid().optional(),
}).strict().superRefine((data, ctx) => {
  if (data.source === "youtube" && (!normalizeYoutube(data.youtubeUrl) || data.mode !== "view"))
    ctx.addIssue({ code: "custom", path: ["youtubeUrl"], message: "Bạn dán đường dẫn video YouTube hợp lệ." });
  if (data.source === "file" && !data.id && !data.uploadId)
    ctx.addIssue({ code: "custom", path: ["uploadId"], message: "Bạn tải tệp lên trước khi lưu." });
});
export const uploadSchema = z.object({ filename: z.string().min(1).max(255), contentType: z.string().max(100), size: z.number(), mode: z.enum(["view", "download"]) }).strict()
  .superRefine((data, ctx) => { const error = validateUpload(data); if (error) ctx.addIssue({ code: "custom", message: error }); });
export const lessonSchema = z.object({
  id: z.uuid().optional(), title: z.string().trim().min(1, "Bạn nhập tên bài học.").max(200, "Tên tối đa 200 ký tự."),
  phase: z.enum(["foundation", "specialist"]), baseDays: z.number({ error: "Bạn nhập số ngày từ 0 đến 3650." }).int("Bạn nhập số ngày nguyên.").min(0, "Bạn nhập số ngày từ 0 đến 3650.").max(3650, "Bạn nhập số ngày từ 0 đến 3650.").nullable(),
  lessonNumbers: z.array(z.number({ error: "Bạn nhập số bài học, ví dụ 4/5." }).int("Bạn nhập số bài nguyên.").min(1, "Bạn nhập số bài từ 1 đến 999.").max(999, "Bạn nhập số bài từ 1 đến 999.")).min(1, "Bạn nhập số bài học.").max(10, "Bạn nhập tối đa 10 số bài."), active: z.boolean(),
}).strict();
export const idSchema = z.object({ id: z.uuid() }).strict();
export const toggleSchema = idSchema.extend({ active: z.boolean(), expectedActive: z.boolean() });
export const reorderSchema = idSchema.extend({ direction: z.enum(["up", "down"]), expectedOrder: z.array(z.uuid()).max(2000) });
export const trialSwapSchema = z.object({ lessonIds: z.array(z.uuid()).length(3), expectedIds: z.array(z.uuid()).length(3) }).strict()
  .refine((data) => new Set(data.lessonIds).size === 3, "Bạn chọn ba bài khác nhau.");
export const confirmLessonSchema = confirmTrialLessonSchema;
export const bulkConfirmSchema = z.object({ studentId: z.uuid(), lessons: z.array(confirmLessonSchema.omit({ studentId: true, completed: true })).min(1).max(30) }).strict()
  .refine((data) => new Set(data.lessons.map((l) => l.planLessonId)).size === data.lessons.length);
export type ManagedLesson = { id: string; phase: "foundation" | "specialist"; lessonNumbers: number[]; title: string; baseDays: number | null; sortOrder: number; trialOrder: number | null; active: boolean; resourceCount: number; planCount: number };
export type ManagedResource = { id: string; lessonId: string | null; title: string; audience: "trial" | "formal" | "all"; mode: "view" | "download"; active: boolean; sortOrder: number; format: "youtube" | "pdf" | "image" | "file"; filename: string | null; size: number | null; youtubeUrl: string | null };
export type LearningProgress = { studentId: string; kind: "trial" | "formal" | null; active: boolean; lessons: { id: string; phase: "foundation" | "specialist"; title: string; trialOrder: number | null; dueDate: string | null; reportedAt: string | null; completedAt: string | null; progressNote: string | null; submissionUrl: string | null }[] };
