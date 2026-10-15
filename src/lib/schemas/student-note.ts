import { z } from "zod";
import { CONTACT_CHANNELS, CONTACT_OUTCOMES } from "@/lib/crm";

export const studentNoteSchema = z.object({
  studentId: z.uuid("Học viên không hợp lệ"),
  body: z.string().trim().min(1, "Vui lòng nhập nội dung ghi chú").max(4000, "Ghi chú tối đa 4.000 ký tự"),
  channel: z.enum(CONTACT_CHANNELS).default("call"),
  outcome: z.enum(CONTACT_OUTCOMES).nullable().optional(),
  nextActionAt: z.iso.datetime({ offset: true }).nullable().optional(),
}).strict();

export type StudentNoteInput = z.input<typeof studentNoteSchema>;

export const editStudentNoteSchema = z.object({
  studentId: z.uuid(), noteId: z.uuid(), body: studentNoteSchema.shape.body,
  expectedBody: z.string().max(4000),
}).strict();
