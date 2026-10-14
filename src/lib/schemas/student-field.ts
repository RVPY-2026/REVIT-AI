import { z } from "zod";
import { leadSignupSchema } from "@/lib/schemas/lead";
import { updateStudentContactSchema } from "@/lib/schemas/student-contact";

export const studentFieldNames = ["fullName", "phone", "email", "occupation", "birthYear", "specialty", "hometown", "organization", "zaloName", "signupAnswer"] as const;
export type StudentFieldName = typeof studentFieldNames[number];

export const updateStudentFieldSchema = z.object({
  studentId: z.uuid(),
  field: z.enum(studentFieldNames),
  value: z.string().max(4000),
  expectedValue: z.string().max(4000),
  answerKey: z.string().min(1).max(80).optional(),
  duplicateAcknowledged: z.boolean().optional(),
}).strict().superRefine((data, ctx) => {
  if ((data.field === "signupAnswer") !== Boolean(data.answerKey)) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Trường cập nhật chưa hợp lệ." });
    return;
  }
  const validator = data.field === "fullName" ? leadSignupSchema.shape.fullName
    : data.field === "phone" ? leadSignupSchema.shape.phone
    : data.field === "email" ? updateStudentContactSchema.shape.email
    : data.field === "birthYear" ? z.string()
      .refine((value) => value === "" || /^\d{4}$/.test(value), "Năm sinh gồm 4 chữ số")
      .refine((value) => value === "" || (Number(value) >= 1900 && Number(value) <= new Date().getFullYear()), "Năm sinh chưa hợp lệ")
    : z.string().trim().max(data.field === "signupAnswer" ? 4000 : 200);
  const result = validator.safeParse(data.value.trim());
  if (!result.success) ctx.addIssue({ code: "custom", path: ["value"], message: result.error.issues[0]?.message ?? "Giá trị chưa hợp lệ." });
});

export type UpdateStudentFieldInput = z.input<typeof updateStudentFieldSchema>;

export function normalizeStudentField(field: StudentFieldName, value: string): string | number | null {
  const trimmed = value.trim();
  if (field === "fullName") return leadSignupSchema.shape.fullName.parse(value);
  if (field === "phone") return leadSignupSchema.shape.phone.parse(value);
  if (field === "email") return updateStudentContactSchema.shape.email.parse(value);
  if (field === "birthYear") return trimmed ? Number(trimmed) : null;
  if (field === "signupAnswer") return trimmed;
  return trimmed || null;
}

export const updateStudentProfileSchema = z.object({
  studentId: z.uuid(),
  duplicateAcknowledged: z.boolean().optional(),
  changes: z.array(z.object({
    field: z.enum(studentFieldNames),
    value: z.string().max(4000),
    expectedValue: z.string().max(4000),
    answerKey: z.string().min(1).max(80).optional(),
  }).strict()).min(1).max(30),
}).strict();

/** Key shared by the form and the action so an error lands on the right input. */
export const studentChangeKey = (change: { field: StudentFieldName; answerKey?: string }) =>
  change.field === "signupAnswer" ? `signupAnswer:${change.answerKey}` : change.field;
