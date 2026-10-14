import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db";
import { leadSignupSessions, students, zaloBotConnections } from "@/server/db/schema";
import { createZaloLinkCode } from "@/server/zalo/link-code";

export const SIGNUP_COOKIE = "rvpy-signup-session";
export const ZALO_LINK_COOKIE = "rvpy-zalo-link";
export const SIGNUP_SESSION_SECONDS = 7 * 24 * 60 * 60;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class SignupSessionError extends Error {}
export const hashSignupToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newSignupToken = () => randomBytes(32).toString("hex");

export function signupSessionConditions(token: string | undefined, now = new Date()) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return and(eq(leadSignupSessions.tokenHash, hashSignupToken(token)), gt(leadSignupSessions.expiresAt, now));
}

/** Public scope is the unguessable cookie, never a phone number or client-supplied student id. */
export async function getSignupSession(token: string | undefined, conn: typeof db = db) {
  const where = signupSessionConditions(token);
  if (!where) return null;
  const [row] = await conn.select({ id: students.id, code: students.code, phone: students.phone })
    .from(leadSignupSessions).innerJoin(students, eq(students.id, leadSignupSessions.studentId))
    .where(where).limit(1);
  return row ?? null;
}

/** Lock ownership before the connection, so renewal and concurrent requests serialize. */
export async function renewSignupZaloCode(tx: Tx, token: string | undefined, now = new Date()) {
  const where = signupSessionConditions(token, now);
  if (!where) throw new SignupSessionError("Phiên đăng ký đã hết hạn. Bạn liên hệ RVPY để được hỗ trợ nhé.");
  const [session] = await tx.select({ studentId: leadSignupSessions.studentId, code: students.code })
    .from(leadSignupSessions).innerJoin(students, eq(students.id, leadSignupSessions.studentId))
    .where(where).for("update", { of: leadSignupSessions }).limit(1);
  if (!session) throw new SignupSessionError("Phiên đăng ký đã hết hạn. Bạn liên hệ RVPY để được hỗ trợ nhé.");
  const [connection] = await tx.select({ chatId: zaloBotConnections.chatId, codeIssuedAt: zaloBotConnections.codeIssuedAt })
    .from(zaloBotConnections).where(eq(zaloBotConnections.studentId, session.studentId)).for("update").limit(1);
  if (connection?.chatId) return { connected: true as const, token: null };
  if (connection && now.getTime() - connection.codeIssuedAt.getTime() < 60_000)
    throw new SignupSessionError("Bạn đợi một phút trước khi lấy mã mới nhé.");
  const linkCode = createZaloLinkCode(session.code);
  await tx.insert(zaloBotConnections).values({ studentId: session.studentId, linkTokenHash: hashSignupToken(linkCode),
    expiresAt: new Date(now.getTime() + 30 * 60_000), codeIssuedAt: now })
    .onConflictDoUpdate({ target: zaloBotConnections.studentId, set: {
      linkTokenHash: hashSignupToken(linkCode), expiresAt: new Date(now.getTime() + 30 * 60_000), codeIssuedAt: now,
    } });
  return { connected: false as const, token: linkCode };
}

/** Only show a cookie code after checking ownership, current hash and expiry. */
export async function getSignupZaloState(token: string | undefined, linkCode: string | undefined, code: string) {
  const session = await getSignupSession(token);
  if (!session || session.code !== code) return null;
  const [connection] = await db.select({ chatId: zaloBotConnections.chatId, linkTokenHash: zaloBotConnections.linkTokenHash,
    expiresAt: zaloBotConnections.expiresAt }).from(zaloBotConnections).where(eq(zaloBotConnections.studentId, session.id)).limit(1);
  if (connection?.chatId) return { connected: true, token: null };
  return { connected: false, token: linkCode && connection && connection.expiresAt > new Date()
    && connection.linkTokenHash === hashSignupToken(linkCode) ? linkCode : null };
}
