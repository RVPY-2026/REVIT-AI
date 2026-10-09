import { z } from "zod";

export const emailSignInSchema = z.object({
  email: z
    .email("Vui lòng nhập địa chỉ email hợp lệ")
    .max(254, "Email quá dài")
    .transform((value) => value.trim().toLowerCase()),
});

export type EmailSignInInput = z.input<typeof emailSignInSchema>;
