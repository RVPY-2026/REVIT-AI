import { z } from "zod";
import { LEAD_CHANNEL_OPTIONS, OCCUPATION_OPTIONS } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";

// Shared by the trial sign-up form (react-hook-form) and the server action.
export const leadSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên").max(200, "Họ tên tối đa 200 ký tự"),
  phone: z
    .string()
    .max(30, "Số điện thoại quá dài")
    .transform(normalizePhone)
    .pipe(z.string().regex(/^0\d{9}$/, "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0")),
  email: z
    .email("Email chưa đúng định dạng").max(254, "Email quá dài")
    .transform((v) => v.toLowerCase())
    .refine((v) => v.endsWith("@gmail.com"), "Vui lòng dùng Gmail để nhận tài liệu khóa học"),
  occupation: z.enum(OCCUPATION_OPTIONS, { error: "Vui lòng chọn nghề nghiệp" }),
  birthYear: z.number({ error: "Vui lòng nhập năm sinh" }).int("Năm sinh phải là số nguyên").min(1900, "Năm sinh chưa hợp lệ").max(new Date().getFullYear(), "Năm sinh chưa hợp lệ"),
  specialty: z.string().trim().min(1, "Vui lòng nhập chuyên ngành").max(200, "Chuyên ngành tối đa 200 ký tự"),
  hometown: z.string().trim().min(1, "Vui lòng nhập quê quán").max(200, "Quê quán tối đa 200 ký tự"),
  organization: z.string().trim().min(1, "Vui lòng nhập đơn vị công tác hoặc học tập").max(200, "Đơn vị tối đa 200 ký tự"),
  facebookLink: z.url("Vui lòng nhập đường dẫn Facebook hợp lệ").max(500, "Đường dẫn Facebook tối đa 500 ký tự"),
  answers: z.record(z.string().max(80, "Tên câu hỏi quá dài"), z.string().max(4000, "Câu trả lời tối đa 4.000 ký tự"))
    .refine((answers) => Object.keys(answers).length <= 30, "Quá nhiều câu trả lời")
    .superRefine((answers, ctx) => {
      if (answers.heardAbout && !LEAD_CHANNEL_OPTIONS.includes(answers.heardAbout as (typeof LEAD_CHANNEL_OPTIONS)[number])) {
        ctx.addIssue({ code: "custom", path: ["heardAbout"], message: "Nguồn biết đến RVPY chưa hợp lệ" });
      }
      if (answers.heardAbout === "Khác" && !answers.heardAboutOther?.trim()) {
        ctx.addIssue({ code: "custom", path: ["heardAboutOther"], message: "Vui lòng cho biết nguồn bạn biết đến RVPY" });
      }
      if (answers.heardAbout === "Được người khác giới thiệu" && !answers.heardAboutOther?.trim()) {
        ctx.addIssue({ code: "custom", path: ["heardAboutOther"], message: "Vui lòng nhập tên người giới thiệu" });
      }
    }).default({}),
  /** Source code from the ad link (?src=A). Unknown or missing → R. */
  sourceCode: z.string().trim().max(10, "Mã nguồn quá dài").toUpperCase().optional(),
  /** Referrer's student code from a referral link (?ref=R2610007). */
  referrerCode: z.string().trim().max(8, "Mã giới thiệu quá dài").toUpperCase().optional(),
  captchaToken: z.string().max(2048).optional(),
});

export type LeadSignupInput = z.input<typeof leadSignupSchema>;

/** Staff can enter a prospect before an email or full questionnaire is available. */
export const manualLeadSchema = leadSignupSchema.omit({ sourceCode: true, referrerCode: true, captchaToken: true }).extend({
  sourceId: z.uuid("Nguồn chưa hợp lệ"),
  duplicateAcknowledged: z.boolean().optional(),
  email: z.string().trim().pipe(z.email("Email chưa đúng định dạng").max(254, "Email quá dài")).transform((v) => v.toLowerCase()).optional(),
  occupation: z.string().trim().max(200, "Nghề nghiệp tối đa 200 ký tự").optional(),
  birthYear: z.number().int("Năm sinh phải là số nguyên").min(1900, "Năm sinh chưa hợp lệ").max(new Date().getFullYear(), "Năm sinh chưa hợp lệ").optional(),
  specialty: z.string().trim().max(200, "Chuyên ngành tối đa 200 ký tự").optional(),
  hometown: z.string().trim().max(200, "Quê quán tối đa 200 ký tự").optional(),
  organization: z.string().trim().max(200, "Đơn vị tối đa 200 ký tự").optional(),
  facebookLink: z.url("Đường dẫn Facebook chưa hợp lệ").max(500, "Đường dẫn Facebook tối đa 500 ký tự").optional(),
});
export type ManualLeadInput = z.input<typeof manualLeadSchema>;
