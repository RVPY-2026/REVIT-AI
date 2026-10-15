import "server-only";
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import type { AdSource } from "@/lib/schemas/ad-source";
import { db, type Db } from "@/server/db";
import { adSources, students, users, userRoles } from "@/server/db/schema";
import { studentScope } from "@/server/auth/scope";

export async function listAdSources(user: SessionUser, conn: Db = db): Promise<AdSource[]> {
  if (!can(user, "sources.manage")) throw new Error("Forbidden");
  const rows = await conn.select({ id: adSources.id, code: adSources.code, name: adSources.name,
    ownerUserId: adSources.ownerUserId, ownerName: users.name, ownerEmail: users.email, active: adSources.active,
  }).from(adSources).leftJoin(users, eq(users.id, adSources.ownerUserId)).orderBy(asc(adSources.code));
  const month = sql<string>`to_char(${students.signedUpAt} at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM')`;
  const stats = await conn.select({ sourceId: students.sourceId, month, leads: count(),
    enrolled: sql<number>`count(*) filter (where ${students.status} = 'enrolled')`.mapWith(Number),
  }).from(students).where(studentScope(user, "management")).groupBy(students.sourceId, month);
  const now = new Date();
  const current = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).format(now);
  const months = Array.from({ length: 6 }, (_, i) => {
    const [year, m] = current.split("-").map(Number);
    return new Date(Date.UTC(year, m - 1 - i, 1)).toISOString().slice(0, 7);
  }).reverse();
  return rows.map((row) => {
    const sourceStats = stats.filter((s) => s.sourceId === row.id);
    const total = sourceStats.reduce((n, s) => n + s.leads, 0);
    const enrolled = sourceStats.reduce((n, s) => n + s.enrolled, 0);
    return { ...row, total, enrolled, conversion: total ? enrolled / total : null,
      monthLeads: sourceStats.find((s) => s.month === current)?.leads ?? 0,
      months: months.map((month) => ({ month, leads: sourceStats.find((s) => s.month === month)?.leads ?? 0,
        total: sourceStats.filter((s) => s.month <= month).reduce((n, s) => n + s.leads, 0),
        enrolled: sourceStats.filter((s) => s.month <= month).reduce((n, s) => n + s.enrolled, 0) })) };
  });
}
export async function listSourceOwners(user: SessionUser, conn: Db = db) {
  if (!can(user, "sources.manage")) throw new Error("Forbidden");
  return conn.select({ id: users.id, name: users.name, email: users.email }).from(users)
    .innerJoin(userRoles, and(eq(userRoles.userId, users.id), eq(userRoles.role, "sale")))
    .where(isNull(users.disabledAt)).orderBy(asc(users.name));
}
