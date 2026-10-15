"use server";

import { z } from "zod";
import { getPhoneMatches } from "@/lib/api/students";
import { requirePermission } from "@/server/auth/session";
import { USE_MOCK } from "@/lib/runtime-mode";
import { leadSignupSchema } from "@/lib/schemas/lead";
import { studentIdSchema } from "@/lib/schemas/student";
import type { ActionResult } from "@/server/result";
import type { PhoneMatch } from "@/server/phone-matches";

export async function checkStudentPhone(input: unknown): Promise<ActionResult<{ matches: PhoneMatch[] }>> {
  const user = await requirePermission("students.view");
  const parsed = z.object({ phone: leadSignupSchema.shape.phone, excludeId: studentIdSchema.optional() }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, error: "Số điện thoại hoặc hồ sơ chưa hợp lệ." };
  try {
    if (!USE_MOCK) {
      const [{ db }, { consumeStudentPhoneLookup }] = await Promise.all([import("@/server/db"), import("@/server/student-phone-limit")]);
      if (!await consumeStudentPhoneLookup(db, user.id)) return { ok: false, error: "Bạn đã tra cứu nhiều số điện thoại. Vui lòng chờ một phút rồi thử lại." };
    }
    const matches = await getPhoneMatches(parsed.data.phone);
    return { ok: true, data: { matches: matches.filter(match => "otherSource" in match || match.id !== parsed.data.excludeId) } };
  } catch { return { ok: false, error: "Chưa thể kiểm tra số điện thoại. Bạn thử lại sau nhé." }; }
}
