import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { formatStudentCode, studentCodeMonth } from "@/lib/student-code";
import type { Db } from "@/server/db";
import { audit } from "@/server/audit";
import { sourceMonthCounters, students, studentStatusEvents } from "@/server/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type LeadFields = {
  fullName: string; phone: string; email?: string; occupation?: string;
  birthYear?: number; specialty?: string; hometown?: string; organization?: string;
};
export class DuplicateSignupError extends Error {}

/** The caller resolves an active, authorized source before entering this operation. */
export async function insertLeadRecord(
  tx: Tx, source: { id: string; code: string }, fields: LeadFields,
  answers: Record<string, string>, actorId: string | null, referredById: string | null = null,
) {
  const signedUpAt = new Date();
  // Serialize public retries for this normalized phone before consuming a code.
  if (actorId === null) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${fields.phone}))`);
    const [recent] = await tx.select({ id: students.id, code: students.code }).from(students)
      .where(and(eq(students.phone, fields.phone), gte(students.signedUpAt, new Date(signedUpAt.getTime() - 5 * 60_000))))
      .orderBy(desc(students.signedUpAt)).limit(1);
    if (recent) throw new DuplicateSignupError("Nếu bạn đã đăng ký, hãy mở lại trang cảm ơn trên trình duyệt cũ hoặc liên hệ RVPY qua Zalo nhé.");
  }
  const codeMonth = studentCodeMonth(signedUpAt);
  const [counter] = await tx.insert(sourceMonthCounters)
    .values({ sourceId: source.id, codeMonth, nextSeq: 2 })
    .onConflictDoUpdate({
      target: [sourceMonthCounters.sourceId, sourceMonthCounters.codeMonth],
      set: { nextSeq: sql`${sourceMonthCounters.nextSeq} + 1` },
      setWhere: sql`${sourceMonthCounters.nextSeq} <= 999`,
    })
    .returning({ seq: sql<number>`${sourceMonthCounters.nextSeq} - 1` });
  if (!counter) throw new Error("Monthly code range is exhausted");

  const [row] = await tx.insert(students).values({
    ...fields, sourceId: source.id, codeMonth, seq: counter.seq,
    code: formatStudentCode(source.code, codeMonth, counter.seq),
    signupAnswers: answers, referredById, signedUpAt,
  }).returning({ id: students.id, code: students.code });
  await tx.insert(studentStatusEvents).values({ studentId: row.id, toStatus: "new", changedById: actorId });
  await audit(tx, {
    actorId, action: actorId ? "student.created_manually" : "student.signed_up",
    entity: "students", entityId: row.id,
  });
  return row;
}
