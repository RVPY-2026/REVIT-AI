"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
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
import { DuplicatePhoneError, requirePhoneAcknowledgment } from "@/server/phone-matches";

const DEFAULT_SOURCE = "R";

/** Query errors may wrap driver failures; never log their query, parameters or message. */
function signupFailureCode(error: unknown): string | undefined {
  let current = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 6; depth++) {
    if (!current || typeof current !== "object" || seen.has(current)) return;
    seen.add(current);
    const failure = current as { code?: unknown; cause?: unknown };
    if (typeof failure.code === "string" && /^[A-Z0-9_]{2,40}$/.test(failure.code)) return failure.code;
    current = failure.cause;
  }
}

function signupFailureMessage(code: string | undefined, stage: string): string {
  if (stage === "confirmation")
    return "Chưa hoàn tất xác nhận đăng ký. Bạn giữ trình duyệt này và liên hệ RVPY qua Zalo để kiểm tra, tránh đăng ký trùng.";
  if (code === "42703" || code === "42P01" || code === "42883")
    return "Hệ thống đăng ký chưa được cập nhật đầy đủ. Đây không phải lỗi thông tin bạn nhập; bạn liên hệ RVPY qua Zalo để được hỗ trợ.";
  if (code?.startsWith("08") || ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "CONNECT_TIMEOUT", "57P01", "53300"].includes(code ?? ""))
    return "Kết nối lưu đăng ký đang gián đoạn. Thông tin trên biểu mẫu vẫn được giữ; bạn thử lại sau ít phút hoặc liên hệ RVPY qua Zalo.";
  return "Hệ thống gặp lỗi khi xử lý đăng ký. Thông tin trên biểu mẫu vẫn được giữ; bạn liên hệ RVPY qua Zalo và gửi mã hỗ trợ bên dưới.";
}

/** Anonymous signup returns only a code; source attribution is validated server-side. */
export async function submitLeadSignup(input: LeadSignupInput): Promise<ActionResult<{ code: string }>> {
  const parsed = leadSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ", fieldErrors: parsed.error.flatten().fieldErrors };
  if (USE_MOCK) return { ok: false, error: "Đăng ký học thử chưa được mở trong môi trường này. Bạn liên hệ RVPY qua Zalo nhé." };
  const { sourceCode, referrerCode, answers, facebookLink, captchaToken, ...lead } = parsed.data;
  const canLinkZaloBot = Boolean(serverEnv.ZALO_BOT_TOKEN && serverEnv.ZALO_BOT_WEBHOOK_SECRET);
  let stage = "request";
  try {
    const cookieStore = await cookies();
    const ip = signupClientIp(await headers());
    stage = "rate-limit";
    await requireSignupLimits(ip);
    stage = "captcha";
    await validateSignupCaptcha(captchaToken);
    stage = "signup-session";
    const owned = await getSignupSession(cookieStore.get(SIGNUP_COOKIE)?.value);
    // Retrying from the original browser never creates another profile, even after five minutes.
    if (owned?.phone === lead.phone) return { ok: true, data: { code: owned.code } };
    stage = "rate-limit";
    await requireSignupLimits(ip, lead.phone);
    const signupToken = newSignupToken();
    stage = "create-lead";
    const row = await db.transaction(async (tx) => {
      stage = "source";
      const candidates = await tx.select({ id: adSources.id, code: adSources.code }).from(adSources)
        .where(and(inArray(adSources.code, [sourceCode ?? DEFAULT_SOURCE, DEFAULT_SOURCE]), eq(adSources.active, true)))
        .orderBy(asc(adSources.code)).for("share");
      const source = candidates.find((s) => s.code === sourceCode) ?? candidates.find((s) => s.code === DEFAULT_SOURCE);
      if (!source) {
        stage = "source-not-configured";
        throw new Error("Default source is missing");
      }
      // Public attribution lookup: internal ID only, never exposed to the caller.
      stage = "referrer";
      const [referrer] = referrerCode
        ? await tx.select({ id: students.id }).from(students).where(eq(students.code, referrerCode)).limit(1) : [];
      stage = "lead-record";
      const row = await insertLeadRecord(tx, source, lead, { ...answers, facebookLink }, null, referrer?.id ?? null);
      stage = "signup-session";
      await tx.insert(leadSignupSessions).values({ tokenHash: hashSignupToken(signupToken), studentId: row.id,
        expiresAt: new Date(Date.now() + SIGNUP_SESSION_SECONDS * 1000) });
      stage = "zalo-link";
      const link = canLinkZaloBot ? await renewSignupZaloCode(tx, signupToken) : null;
      return { ...row, linkCode: link?.token ?? null };
    });
    stage = "confirmation";
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
    cookieStore.set(SIGNUP_COOKIE, signupToken, { ...cookieOptions, maxAge: SIGNUP_SESSION_SECONDS });
    if (row.linkCode) {
      cookieStore.set(ZALO_LINK_COOKIE, row.linkCode, { ...cookieOptions, path: "/dang-ky/thanh-cong", maxAge: 30 * 60 });
    }
    return { ok: true, data: { code: row.code } };
  } catch (error) {
    if (error instanceof DuplicateSignupError || error instanceof SignupProtectionError) return { ok: false, error: error.message };
    const incidentId = randomUUID().slice(0, 8);
    const code = signupFailureCode(error);
    console.error("[lead-signup-failed]", { incidentId, stage, code: code ?? "UNKNOWN" });
    const message = stage === "source-not-configured"
      ? "Hệ thống chưa cấu hình nơi tiếp nhận đăng ký. Bạn liên hệ RVPY qua Zalo để được hỗ trợ."
      : signupFailureMessage(code, stage);
    return { ok: false, error: `${message} Mã hỗ trợ: ${incidentId}.` };
  }
}

/** Management create operation; sales staff cannot select another person's source. */
export async function createManualLead(input: ManualLeadInput): Promise<ActionResult<{ id: string; code: string }>> {
  const parsed = manualLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ", fieldErrors: parsed.error.flatten().fieldErrors };
  const user = await requirePermission("students.create");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử không lưu học viên mới." };
  const { sourceId, answers, facebookLink, duplicateAcknowledged, ...lead } = parsed.data;
  try {
    const row = await db.transaction(async (tx) => {
      const [source] = await tx.select({ id: adSources.id, code: adSources.code }).from(adSources)
        .where(and(eq(adSources.id, sourceId), eq(adSources.active, true),
          isAdmin(user) ? undefined : eq(adSources.ownerUserId, user.id))).for("share").limit(1);
      if (!source) return null;
      await requirePhoneAcknowledgment(tx, user, lead.phone, duplicateAcknowledged);
      return insertLeadRecord(tx, source, lead, { ...answers, ...(facebookLink ? { facebookLink } : {}) }, user.id, null, duplicateAcknowledged);
    });
    if (!row) return { ok: false, error: "Nguồn không tồn tại hoặc bạn không có quyền sử dụng." };
    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath("/quan-tri");
    return { ok: true, data: row };
  } catch (error) {
    if (error instanceof DuplicatePhoneError) return { ok: false, error: error.message };
    return { ok: false, error: "Chưa thể thêm học viên. Bạn thử lại sau nhé." };
  }
}
