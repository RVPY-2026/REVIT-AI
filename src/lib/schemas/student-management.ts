import { z } from "zod";
import { ARCHIVE_REASONS } from "@/lib/crm";

export const archiveStudentSchema = z.object({
  studentId: z.uuid(), expectedArchivedAt: z.iso.datetime().nullable(),
  reason: z.enum(ARCHIVE_REASONS), note: z.string().trim().max(4000).optional(),
}).strict().refine(data => data.reason !== "other" || Boolean(data.note), { path: ["note"], message: "Bạn nhập ghi chú cho lý do khác." });
export const restoreStudentSchema = z.object({ studentId: z.uuid(), expectedArchivedAt: z.iso.datetime() }).strict();
export const transferStudentSchema = z.object({ studentId: z.uuid(), expectedSourceId: z.uuid(), sourceId: z.uuid(), reason: z.string().trim().min(1).max(4000) }).strict();
