"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { USE_MOCK } from "@/lib/runtime-mode";
import { isAdmin } from "@/lib/auth/permissions";
import { leadSignupSchema, manualLeadSchema, type LeadSignupInput, type ManualLeadInput } from "@/lib/schemas/lead";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { adSources, students } from "@/server/db/schema";
import { insertLeadRecord } from "@/server/lead-record";
import type { ActionResult } from "@/server/result";

const DEFAULT_SOURCE = "R";

/** Anonymous signup returns only a code; source attribution is validated server-side. */
export async function submitLeadSignup(input: LeadSignupInput): Promise<ActionResult<{ code: string }>> {
  const parsed = leadSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ", fieldErrors: parsed.error.flatten().fieldErrors };
  if (USE_MOCK) return { ok: false, error: "Đăng ký học thử chưa được mở trong môi trường này. Bạn liên hệ RVPY qua Zalo nhé." };
  const { sourceCode, referrerCode, answers, ...lead } = parsed.data;
  try {
    const row = await db.transaction(async (tx) => {
      const candidates = await tx.select({ id: adSources.id, code: adSources.code }).from(adSources)
        .where(and(inArray(adSources.code, [sourceCode ?? DEFAULT_SOURCE, DEFAULT_SOURCE]), eq(adSources.active, true)));
      const source = candidates.find((s) => s.code === sourceCode) ?? candidates.find((s) => s.code === DEFAULT_SOURCE);
      if (!source) throw new Error("Default source is missing");
      // Public attribution lookup: internal ID only, never exposed to the caller.
      const [referrer] = referrerCode
        ? await tx.select({ id: students.id }).from(students).where(eq(students.code, referrerCode)).limit(1) : [];
      return insertLeadRecord(tx, source, lead, answers, null, referrer?.id ?? null);
    });
    return { ok: true, data: { code: row.code } };
  } catch {
    return { ok: false, error: "Chưa thể đăng ký lúc này. Bạn thử lại sau nhé." };
  }
}

/** Management create operation; sales staff cannot select another person's source. */
export async function createManualLead(input: ManualLeadInput): Promise<ActionResult<{ id: string; code: string }>> {
  const parsed = manualLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ", fieldErrors: parsed.error.flatten().fieldErrors };
  const user = await requirePermission("students.create");
  const { sourceId, answers, ...lead } = parsed.data;
  try {
    const row = await db.transaction(async (tx) => {
      const [source] = await tx.select({ id: adSources.id, code: adSources.code }).from(adSources)
        .where(and(eq(adSources.id, sourceId), eq(adSources.active, true),
          isAdmin(user) ? undefined : eq(adSources.ownerUserId, user.id))).limit(1);
      if (!source) return null;
      return insertLeadRecord(tx, source, lead, answers, user.id);
    });
    if (!row) return { ok: false, error: "Nguồn không tồn tại hoặc bạn không có quyền sử dụng." };
    revalidatePath("/quan-tri/hoc-vien");
    return { ok: true, data: row };
  } catch {
    return { ok: false, error: "Chưa thể thêm học viên. Bạn thử lại sau nhé." };
  }
}
