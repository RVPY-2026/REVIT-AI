import { z } from "zod";

// Shared by the trial sign-up form (react-hook-form) and the server action.
export const leadSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên"),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^0\d{9}$/, "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0")),
  email: z
    .email("Email chưa đúng định dạng")
    .transform((v) => v.toLowerCase())
    .refine((v) => v.endsWith("@gmail.com"), "Vui lòng dùng địa chỉ Gmail để đăng nhập sau này"),
  occupation: z.string().trim().min(1, "Vui lòng cho biết nghề nghiệp"),
  answers: z.record(z.string(), z.string()).default({}),
  /** Source code from the ad link (?src=A). Unknown or missing → R. */
  sourceCode: z.string().trim().toUpperCase().optional(),
  /** Referrer's student code from a referral link (?ref=R21). */
  referrerCode: z.string().trim().toUpperCase().optional(),
});

export type LeadSignupInput = z.input<typeof leadSignupSchema>;
