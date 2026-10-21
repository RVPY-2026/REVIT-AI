import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { signupRateLimits } from "@/server/db/schema";
import { serverEnv } from "@/server/env";

export class SignupProtectionError extends Error {}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Rule = { key: string; limit: number; windowMs: number };
const HOUR = 3_600_000;

/** Trust only Vercel's overwritten ingress header in production. Other hosts must supply a trusted proxy. */
export function signupClientIp(requestHeaders: Pick<Headers, "get">): string {
  const raw = process.env.VERCEL === "1" ? requestHeaders.get("x-vercel-forwarded-for") : null;
  const value = raw?.split(",")[0]?.trim();
  return value && isIP(value) ? value : "unknown";
}

export function signupLimitRules(ip: string, phone?: string): Rule[] {
  return phone ? [
    { key: `phone:${phone}`, limit: 3, windowMs: HOUR },
    { key: "global:hour", limit: 30, windowMs: HOUR },
    { key: "global:day", limit: 100, windowMs: 24 * HOUR },
  ] : [{ key: `ip:${ip}`, limit: 20, windowMs: 10 * 60_000 }];
}

/** Atomic upserts serialize across processes. Keep committed counters even when the later signup fails. */
export async function consumeSignupLimits(tx: Tx, rules: Rule[], now = new Date(), secret = serverEnv.SIGNUP_RATE_LIMIT_SECRET
  ?? (process.env.NODE_ENV !== "production" ? "rvpy-development-only-rate-limit-secret" : undefined)) {
  if (!secret) throw new SignupProtectionError("Đăng ký trực tuyến chưa sẵn sàng. Bạn liên hệ RVPY qua Zalo nhé.");
  // Raw SQL parameters bypass the timestamp column mapper in the Postgres.js driver.
  const nowIso = now.toISOString();
  for (const rule of [...rules].sort((a, b) => a.key.localeCompare(b.key))) {
    const keyHash = createHmac("sha256", secret).update(rule.key).digest("hex");
    const resetsAt = new Date(now.getTime() + rule.windowMs);
    const [row] = await tx.insert(signupRateLimits).values({ keyHash, used: 1, resetsAt })
      .onConflictDoUpdate({ target: signupRateLimits.keyHash, set: {
        used: sql`case when ${signupRateLimits.resetsAt} <= ${nowIso}::timestamptz then 1 else ${signupRateLimits.used} + 1 end`,
        resetsAt: sql`case when ${signupRateLimits.resetsAt} <= ${nowIso}::timestamptz then ${resetsAt.toISOString()}::timestamptz else ${signupRateLimits.resetsAt} end`,
      }, setWhere: sql`${signupRateLimits.resetsAt} <= ${nowIso}::timestamptz or ${signupRateLimits.used} < ${rule.limit}` })
      .returning({ used: signupRateLimits.used });
    if (!row) return false;
  }
  return true;
}

export async function requireSignupLimits(ip: string, phone?: string) {
  const allowed = await db.transaction((tx) => consumeSignupLimits(tx, signupLimitRules(ip, phone)));
  if (!allowed) throw new SignupProtectionError("Có nhiều yêu cầu đăng ký lúc này. Bạn thử lại sau hoặc liên hệ RVPY qua Zalo nhé.");
}

export async function validateSignupCaptcha(token: string | undefined, request: typeof fetch = fetch) {
  const secret = serverEnv.TURNSTILE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return;
    throw new SignupProtectionError("Đăng ký trực tuyến chưa sẵn sàng. Bạn liên hệ RVPY qua Zalo nhé.");
  }
  if (!token || token.length > 2048 || !siteUrl) throw new SignupProtectionError("Bạn xác minh đăng ký rồi thử lại nhé.");
  try {
    const response = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }), cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true || result.action !== "lead-signup" || result.hostname !== new URL(siteUrl).hostname)
      throw new Error("Rejected verification");
  } catch {
    throw new SignupProtectionError("Chưa xác minh được đăng ký. Bạn xác minh lại rồi thử nhé.");
  }
}

export async function cleanupSignupLimits() {
  await db.transaction((tx) => tx.delete(signupRateLimits).where(lt(signupRateLimits.resetsAt, new Date(Date.now() - 24 * HOUR))));
}
