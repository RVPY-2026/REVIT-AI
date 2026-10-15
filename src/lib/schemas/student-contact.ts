import { z } from "zod";
import { leadSignupSchema } from "@/lib/schemas/lead";

const contactEmailSchema = z.string().max(254, "Email tối đa 254 ký tự")
  .transform((value) => value.trim().toLowerCase())
  .transform((value) => value === "" ? null : value)
  .refine((value) => value === null || z.email().safeParse(value).success, "Email chưa đúng định dạng");

/** Staff contact edits allow any valid email; blank email clears the field. */
export const updateStudentContactSchema = z.object({
  studentId: z.uuid("Học viên chưa hợp lệ"),
  fullName: leadSignupSchema.shape.fullName,
  phone: leadSignupSchema.shape.phone,
  email: contactEmailSchema,
  duplicateAcknowledged: z.boolean().optional(),
}).strict();

export type UpdateStudentContactInput = z.input<typeof updateStudentContactSchema>;

export const saveStudentContactSchema = updateStudentContactSchema.extend({
  expected: z.object({
    fullName: z.string().max(200), phone: z.string().max(30), email: z.string().max(254).nullable(),
  }).strict(),
}).strict();

export class ContactConflictError extends Error {}

/** Only fields the user changed participate in conflict detection and the patch. */
export function contactPatch(current: { fullName: string; phone: string; email: string | null }, data: z.output<typeof saveStudentContactSchema>) {
  const patch: Partial<typeof current> = {};
  for (const field of ["fullName", "phone", "email"] as const) {
    if (data[field] === data.expected[field]) continue;
    if (current[field] !== data.expected[field]) throw new ContactConflictError("Thông tin bạn đang sửa đã thay đổi ở nơi khác. Bản nháp được giữ lại; bạn kiểm tra hồ sơ mới trước khi lưu nhé.");
    if (field === "email") patch.email = data.email;
    else patch[field] = data[field];
  }
  return patch;
}
