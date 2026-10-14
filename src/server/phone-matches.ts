import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { can, isAdmin, type SessionUser } from "@/lib/auth/permissions";
import { normalizePhone, NORMALIZED_PHONE_SQL } from "@/lib/phone";
import { leadSignupSchema } from "@/lib/schemas/lead";
import type { Db } from "@/server/db";
import { studentScope } from "@/server/auth/scope";
import { adSources, students } from "@/server/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type PhoneMatch = { otherSource: true } | {
  id: string; code: string; fullName: string; status: typeof students.$inferSelect.status;
  sourceCode: string; signedUpAt: string;
};
export class DuplicatePhoneError extends Error {
  constructor() { super("Số này đã có hồ sơ. Bạn xác nhận dùng số điện thoại trùng trước khi lưu nhé."); }
}

/** The only cross-source read returns existence, never a hidden profile or its count. */
export async function phoneMatches(connection: Db | Tx, user: SessionUser, phone: string, excludeId?: string): Promise<PhoneMatch[]> {
  if (!can(user, "students.view")) throw new Error("Forbidden");
  const parsed = leadSignupSchema.shape.phone.safeParse(phone);
  if (!parsed.success) return [];
  const match = and(sql`${sql.raw(NORMALIZED_PHONE_SQL)} = ${parsed.data}`, excludeId ? ne(students.id, excludeId) : undefined);
  const own = studentScope(user, "management");
  const rows = await connection.select({ id: students.id, code: students.code, fullName: students.fullName,
    status: students.status, sourceCode: adSources.code, signedUpAt: students.signedUpAt })
    .from(students).innerJoin(adSources, eq(students.sourceId, adSources.id)).where(and(match, own));
  const result: PhoneMatch[] = rows.map(row => ({ ...row, signedUpAt: row.signedUpAt.toISOString() }));
  if (!isAdmin(user)) {
    const [hidden] = await connection.select({ exists: sql<boolean>`exists(select 1 from students where ${match} and not (${own}))` }).from(sql`(values (1)) as existence_probe(n)`);
    if (hidden?.exists) result.push({ otherSource: true });
  }
  return result;
}

/** Shared lock also serializes public creation and edits for the same canonical phone. */
export async function requirePhoneAcknowledgment(tx: Tx, user: SessionUser, phone: string, acknowledged = false, excludeId?: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${normalizePhone(phone)}))`);
  if ((await phoneMatches(tx, user, phone, excludeId)).length && !acknowledged) throw new DuplicatePhoneError();
}
