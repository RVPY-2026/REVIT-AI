import { z } from "zod";

// Shared by the trial sign-up form (react-hook-form) and the server action.
export const leadSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên").max(200, "Họ tên tối đa 200 ký tự"),
  phone: z
    .string()
    .max(30, "Số điện thoại quá dài")
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^0\d{9}$/, "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0")),
  email: z
    .email("Email chưa đúng định dạng").max(254, "Email quá dài")
    .transform((v) => v.toLowerCase())
    .refine((v) => v.endsWith("@gmail.com"), "Vui lòng dùng địa chỉ Gmail để đăng nhập sau này"),
  occupation: z.string().trim().min(1, "Vui lòng cho biết nghề nghiệp").max(200, "Nghề nghiệp tối đa 200 ký tự"),
  birthYear: z.number().int("Năm sinh phải là số nguyên").min(1900, "Năm sinh chưa hợp lệ").max(2100, "Năm sinh chưa hợp lệ").optional(),
  specialty: z.string().trim().max(200, "Chuyên ngành tối đa 200 ký tự").optional(),
  hometown: z.string().trim().max(200, "Quê quán tối đa 200 ký tự").optional(),
  organization: z.string().trim().max(200, "Đơn vị tối đa 200 ký tự").optional(),
  answers: z.record(z.string().max(80, "Tên câu hỏi quá dài"), z.string().max(4000, "Câu trả lời quá dài"))
    .refine((answers) => Object.keys(answers).length <= 30, "Quá nhiều câu trả lời").default({}),
  /** Source code from the ad link (?src=A). Unknown or missing → R. */
  sourceCode: z.string().trim().max(10, "Mã nguồn quá dài").toUpperCase().optional(),
  /** Referrer's student code from a referral link (?ref=R2610007). */
  referrerCode: z.string().trim().max(8, "Mã giới thiệu quá dài").toUpperCase().optional(),
});

export type LeadSignupInput = z.input<typeof leadSignupSchema>;

/** Staff can enter a prospect before an email or full questionnaire is available. */
export const manualLeadSchema = leadSignupSchema.omit({ sourceCode: true, referrerCode: true }).extend({
  sourceId: z.uuid("Nguồn chưa hợp lệ"),
  email: z.email("Email chưa đúng định dạng").max(254, "Email quá dài").transform((v) => v.toLowerCase()).optional(),
  occupation: z.string().trim().max(200, "Nghề nghiệp tối đa 200 ký tự").optional(),
});
export type ManualLeadInput = z.input<typeof manualLeadSchema>;
