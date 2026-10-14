"use server";

import { cookies } from "next/headers";
import { USE_MOCK } from "@/lib/runtime-mode";
import { db } from "@/server/db";
import { serverEnv } from "@/server/env";
import { SIGNUP_COOKIE, ZALO_LINK_COOKIE, SignupSessionError, renewSignupZaloCode } from "@/server/signup-session";
import type { ActionResult } from "@/server/result";

/** Caller is authorized exclusively by the server-validated ownership cookie. */
export async function renewZaloSignupCode(): Promise<ActionResult<{ token: string | null; connected: boolean }>> {
  if (USE_MOCK || !serverEnv.ZALO_BOT_TOKEN || !serverEnv.ZALO_BOT_WEBHOOK_SECRET)
    return { ok: false, error: "Kết nối tự động chưa sẵn sàng. Bạn liên hệ RVPY qua Zalo nhé." };
  const cookieStore = await cookies();
  try {
    const result = await db.transaction((tx) => renewSignupZaloCode(tx, cookieStore.get(SIGNUP_COOKIE)?.value));
    if (result.token) cookieStore.set(ZALO_LINK_COOKIE, result.token, { httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production", path: "/dang-ky/thanh-cong", maxAge: 30 * 60 });
    else cookieStore.set(ZALO_LINK_COOKIE, "", { httpOnly: true, sameSite: "lax",
      secure: process.env.NODE_ENV === "production", path: "/dang-ky/thanh-cong", maxAge: 0 });
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof SignupSessionError ? error.message : "Chưa thể lấy mã mới. Bạn thử lại sau nhé." };
  }
}
