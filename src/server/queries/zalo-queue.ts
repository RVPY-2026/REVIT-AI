import "server-only";
import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { safeZaloError } from "@/lib/audit-privacy";
import { viewerDates, viewerFilterSchema, type ViewerFilter, type QueueSummary } from "@/lib/schemas/admin-viewers";
import { db, type Db } from "@/server/db";
import { students, zaloBotOutbox } from "@/server/db/schema";
import { studentScope } from "@/server/auth/scope";

/** Shared with the profile: same status definitions, optionally narrowed to one student. */
export async function getZaloQueueSummary(user: SessionUser, studentId?: string, conn: Db = db): Promise<QueueSummary> {
  if (!can(user, "students.view")) throw new Error("Forbidden");
  const [row] = await conn.select({
    failed: sql<number>`count(*) filter (where ${zaloBotOutbox.status} = 'failed')`.mapWith(Number),
    pending: sql<number>`count(*) filter (where ${zaloBotOutbox.status} = 'pending')`.mapWith(Number),
    oldest: sql<string | null>`min(${zaloBotOutbox.createdAt}) filter (where ${zaloBotOutbox.status} = 'pending')`,
  }).from(zaloBotOutbox).innerJoin(students, eq(students.id, zaloBotOutbox.studentId))
    .where(and(studentScope(user, "management"), studentId ? eq(students.id, studentId) : undefined));
  return { pendingCount: row.pending, failedCount: row.failed, oldestPendingAt: row.oldest ? new Date(row.oldest).toISOString() : null };
}
export async function listZaloQueue(user: SessionUser, input: ViewerFilter, conn: Db = db) {
  if (!can(user, "zalo.view")) throw new Error("Forbidden");
  const filter = viewerFilterSchema.parse(input);
  const { start, end } = viewerDates(filter);
  const conditions: SQL[] = [studentScope(user, "management")];
  if (filter.status) conditions.push(eq(zaloBotOutbox.status, filter.status));
  if (start) conditions.push(gte(zaloBotOutbox.createdAt, start));
  if (end) conditions.push(lt(zaloBotOutbox.createdAt, end));
  const where = and(...conditions);
  const [stats] = await conn.select({ total: count() }).from(zaloBotOutbox).innerJoin(students, eq(students.id, zaloBotOutbox.studentId)).where(where);
  const page = Math.min(filter.page, Math.max(1, Math.ceil(stats.total / 50)));
  const rows = await conn.select({ id: zaloBotOutbox.id, studentId: students.id, studentCode: students.code, studentName: students.fullName,
    createdAt: zaloBotOutbox.createdAt, kind: zaloBotOutbox.kind, status: zaloBotOutbox.status, attempts: zaloBotOutbox.attempts,
    availableAt: zaloBotOutbox.availableAt, lastError: zaloBotOutbox.lastError,
  }).from(zaloBotOutbox).innerJoin(students, eq(students.id, zaloBotOutbox.studentId)).where(where)
    .orderBy(desc(zaloBotOutbox.createdAt), desc(zaloBotOutbox.id)).limit(50).offset((page - 1) * 50);
  return { page, total: stats.total, rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(),
    availableAt: r.availableAt.toISOString(), lastError: safeZaloError(r.lastError) })) };
}
