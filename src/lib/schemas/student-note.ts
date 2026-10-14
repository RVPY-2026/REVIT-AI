import { z } from "zod";

export const studentNoteSchema = z.object({
  studentId: z.uuid("Học viên không hợp lệ"),
  body: z.string().trim().min(1, "Vui lòng nhập nội dung ghi chú").max(4000, "Ghi chú tối đa 4.000 ký tự"),
}).strict();

export type StudentNoteInput = z.input<typeof studentNoteSchema>;
