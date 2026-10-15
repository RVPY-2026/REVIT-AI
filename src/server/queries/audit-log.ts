import "server-only";
import { and, count, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { maskPrivateText, sanitizeAuditData } from "@/lib/audit-privacy";
import { literalPattern, viewerDates, viewerFilterSchema, type ViewerFilter } from "@/lib/schemas/admin-viewers";
import { db, type Db } from "@/server/db";
import { adSources, auditLog, students, users } from "@/server/db/schema";
import { studentScope } from "@/server/auth/scope";

export async function listAuditLog(user: SessionUser, input: ViewerFilter, conn: Db = db) {
  if (!can(user, "audit.view")) throw new Error("Forbidden");
  const filter = viewerFilterSchema.parse(input);
  const { start, end } = viewerDates(filter);
  const conditions: SQL[] = [];
  if (start) conditions.push(gte(auditLog.createdAt, start));
  if (end) conditions.push(lt(auditLog.createdAt, end));
  if (filter.actor) conditions.push(or(ilike(users.name, literalPattern(filter.actor)), ilike(users.email, literalPattern(filter.actor)))!);
  if (filter.action) conditions.push(eq(auditLog.action, filter.action));
  if (filter.entity) conditions.push(eq(auditLog.entity, filter.entity));
  if (filter.search) conditions.push(ilike(sql`${auditLog.entityId}::text`, literalPattern(filter.search)));
  // Keep only narrow IDs for the newest 10,000 matches plus one overflow sentinel.
  // Payload/identity joins run for the requested 50 rows, never the whole audit set.
  const filtered = conn.$with("filtered_audit").as(conn.select({ id: auditLog.id, createdAt: auditLog.createdAt })
    .from(auditLog).leftJoin(users, eq(users.id, auditLog.actorId)).where(and(...conditions))
    .orderBy(sql`${auditLog.createdAt} desc nulls last`, sql`${auditLog.id} desc nulls last`).limit(10001));
  const totals = conn.$with("audit_totals").as(conn.select({ total: count().as("total") }).from(filtered));
  const total = sql<number>`least(${totals.total}, 10000)::int`;
  // Offset is bounded at 9,950; older matches require narrower filters. Unlike a
  // cursor this preserves existing page URLs/back navigation, at a fixed work cap.
  const pages = sql<number>`greatest(1, ceil(${total}::numeric / 50))`;
  const page = sql<number>`least(${filter.page}, ${pages})::int`;
  type Row = { id: string; createdAt: string; actor: string | null; action: string; entity: string; entityId: string | null; entityLabel: string; data: unknown };
  const [result] = await conn.with(filtered, totals).select({ total, page,
    totalCapped: sql<boolean>`${totals.total} > 10000`, hasNext: sql<boolean>`${page} < ${pages}`,
    rows: sql<Row[]>`coalesce((select json_agg(json_build_object('id', ${auditLog.id}, 'createdAt', ${auditLog.createdAt},
      'actor', ${users.name}, 'action', ${auditLog.action}, 'entity', ${auditLog.entity}, 'entityId', ${auditLog.entityId},
      'entityLabel', coalesce(${students.code}, ${adSources.code}, ${auditLog.entityId}::text, ''), 'data', ${auditLog.data})
      order by ${auditLog.createdAt} desc, ${auditLog.id} desc)
      from (select id from filtered_audit order by created_at desc, id desc limit 50 offset (${page} - 1) * 50) p
      inner join ${auditLog} on ${auditLog.id} = p.id left join ${users} on ${users.id} = ${auditLog.actorId}
      left join ${students} on ${auditLog.entity} = 'students' and ${students.id} = ${auditLog.entityId} and ${studentScope(user, "management")}
      left join ${adSources} on ${auditLog.entity} = 'ad_sources' and ${adSources.id} = ${auditLog.entityId}), '[]'::json)`,
  // A one-row anchor retains qualified column references inside the nested SQL
  // selection (Drizzle otherwise treats this as a single-table projection).
  }).from(totals).crossJoin(sql`(values (1)) as audit_anchor(n)`);
  return { total: Number(result.total), page: Number(result.page), totalCapped: result.totalCapped, hasNext: result.hasNext, rows: result.rows.map((row) => ({ ...row,
    createdAt: new Date(row.createdAt).toISOString(), actor: maskPrivateText(row.actor ?? "Hệ thống"),
    action: maskPrivateText(row.action), entity: maskPrivateText(row.entity), entityId: row.entityId ? maskPrivateText(row.entityId) : null, entityLabel: maskPrivateText(row.entityLabel),
    data: sanitizeAuditData(row.data) })) };
}
