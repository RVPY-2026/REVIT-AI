"use server";

import { and, eq, inArray } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { USE_MOCK } from "@/lib/runtime-mode";
import { isAdmin } from "@/lib/auth/permissions";
import { leadSignupSchema, manualLeadSchema, type LeadSignupInput, type ManualLeadInput } from "@/lib/schemas/lead";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { adSources, students, leadSignupSessions } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { DuplicateSignupError, insertLeadRecord } from "@/server/lead-record";
import { SIGNUP_COOKIE, ZALO_LINK_COOKIE, SIGNUP_SESSION_SECONDS, hashSignupToken, newSignupToken,
  getSignupSession, renewSignupZaloCode } from "@/server/signup-session";
import { SignupProtectionError, requireSignupLimits, signupClientIp, validateSignupCaptcha } from "@/server/signup-protection";
import type { ActionResult } from "@/server/result";

const DEFAULT_SOURCE = "R";

/** Anonymous signup returns only a code; source attribution is validated server-side. */
export async function submitLeadSignup(input: LeadSignupInput): Promise<ActionResult<{ code: string }>> {
  const parsed = leadSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ", fieldErrors: parsed.error.flatten().fieldErrors };
  if (USE_MOCK) return { ok: false, error: "Đăng ký học thử chưa được mở trong môi trường này. Bạn liên hệ RVPY qua Zalo nhé." };
  const { sourceCode, referrerCode, answers, facebookLink, captchaToken, ...lead } = parsed.data;
  const canLinkZaloBot = Boolean(serverEnv.ZALO_BOT_TOKEN && serverEnv.ZALO_BOT_WEBHOOK_SECRET);
  try {
    const cookieStore = await cookies();
    const ip = signupClientIp(await headers());
    await requireSignupLimits(ip);
    await validateSignupCaptcha(captchaToken);
    const owned = await getSignupSession(cookieStore.get(SIGNUP_COOKIE)?.value);
    // Retrying from the original browser never creates another profile, even after five minutes.
    if (owned?.phone === lead.phone) return { ok: true, data: { code: owned.code } };
    await requireSignupLimits(ip, lead.phone);
    const signupToken = newSignupToken();
    const row = await db.transaction(async (tx) => {
      const candidates = await tx.select({ id: adSources.id, code: adSources.code }).from(adSources)
        .where(and(inArray(adSources.code, [sourceCode ?? DEFAULT_SOURCE, DEFAULT_SOURCE]), eq(adSources.active, true)));
      const source = candidates.find((s) => s.code === sourceCode) ?? candidates.find((s) => s.code === DEFAULT_SOURCE);
      if (!source) throw new Error("Default source is missing");
      // Public attribution lookup: internal ID only, never exposed to the caller.
      const [referrer] = referrerCode
        ? await tx.select({ id: students.id }).from(students).where(eq(students.code, referrerCode)).limit(1) : [];
      const row = await insertLeadRecord(tx, source, lead, { ...answers, facebookLink }, null, referrer?.id ?? null);
      await tx.insert(leadSignupSessions).values({ tokenHash: hashSignupToken(signupToken), studentId: row.id,
        expiresAt: new Date(Date.now() + SIGNUP_SESSION_SECONDS * 1000) });
      const link = canLinkZaloBot ? await renewSignupZaloCode(tx, signupToken) : null;
      return { ...row, linkCode: link?.token ?? null };
    });
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
    cookieStore.set(SIGNUP_COOKIE, signupToken, { ...cookieOptions, maxAge: SIGNUP_SESSION_SECONDS });
    if (row.linkCode) {
      cookieStore.set(ZALO_LINK_COOKIE, row.linkCode, { ...cookieOptions, path: "/dang-ky/thanh-cong", maxAge: 30 * 60 });
    }
    return { ok: true, data: { code: row.code } };
  } catch (error) {
    if (error instanceof DuplicateSignupError || error instanceof SignupProtectionError) return { ok: false, error: error.message };
    return { ok: false, error: "Chưa thể đăng ký lúc này. Bạn thử lại sau nhé." };
  }
}

/** Management create operation; sales staff cannot select another person's source. */
export async function createManualLead(input: ManualLeadInput): Promise<ActionResult<{ id: string; code: string }>> {
  const parsed = manualLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ", fieldErrors: parsed.error.flatten().fieldErrors };
  const user = await requirePermission("students.create");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử không lưu học viên mới." };
  const { sourceId, answers, facebookLink, ...lead } = parsed.data;
  try {
    const row = await db.transaction(async (tx) => {
      const [source] = await tx.select({ id: adSources.id, code: adSources.code }).from(adSources)
        .where(and(eq(adSources.id, sourceId), eq(adSources.active, true),
          isAdmin(user) ? undefined : eq(adSources.ownerUserId, user.id))).limit(1);
      if (!source) return null;
      return insertLeadRecord(tx, source, lead, { ...answers, ...(facebookLink ? { facebookLink } : {}) }, user.id);
    });
    if (!row) return { ok: false, error: "Nguồn không tồn tại hoặc bạn không có quyền sử dụng." };
    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath("/quan-tri");
    return { ok: true, data: row };
  } catch {
    return { ok: false, error: "Chưa thể thêm học viên. Bạn thử lại sau nhé." };
  }
}
