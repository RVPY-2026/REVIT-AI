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
  // One SQL statement supplies count, clamped page and rows from the same snapshot.
  const filtered = conn.$with("filtered_audit").as(conn.select({ id: auditLog.id, createdAt: auditLog.createdAt,
    actor: sql<string | null>`${users.name}`.as("actor_name"), action: auditLog.action, entity: auditLog.entity,
    entityId: auditLog.entityId, data: auditLog.data,
    entityLabel: sql<string>`coalesce(${students.code}, ${adSources.code}, ${auditLog.entityId}::text, '')`.as("entity_label"),
  }).from(auditLog).leftJoin(users, eq(users.id, auditLog.actorId))
    .leftJoin(students, and(eq(auditLog.entity, "students"), eq(students.id, auditLog.entityId), studentScope(user, "management")))
    .leftJoin(adSources, and(eq(auditLog.entity, "ad_sources"), eq(adSources.id, auditLog.entityId)))
    .where(and(...conditions)));
  const totals = conn.$with("audit_totals").as(conn.select({ total: count().as("total") }).from(filtered));
  const page = sql<number>`least(${filter.page}, greatest(1, ceil(${totals.total}::numeric / 50)))::int`;
  type Row = { id: string; createdAt: string; actor: string | null; action: string; entity: string; entityId: string | null; entityLabel: string; data: unknown };
  const [result] = await conn.with(filtered, totals).select({ total: totals.total, page,
    rows: sql<Row[]>`coalesce((select json_agg(json_build_object('id', p.id, 'createdAt', p.created_at,
      'actor', p.actor_name, 'action', p.action, 'entity', p.entity, 'entityId', p.entity_id, 'entityLabel', p.entity_label, 'data', p.data)
      order by p.created_at desc, p.id desc) from (select id, created_at, actor_name, action, entity, entity_id, entity_label, data from filtered_audit
      order by created_at desc, id desc limit 50 offset (${page} - 1) * 50) p), '[]'::json)`,
  }).from(totals);
  return { total: Number(result.total), page: Number(result.page), rows: result.rows.map((row) => ({ ...row,
    createdAt: new Date(row.createdAt).toISOString(), actor: maskPrivateText(row.actor ?? "Hệ thống"),
    action: maskPrivateText(row.action), entity: maskPrivateText(row.entity), entityId: row.entityId ? maskPrivateText(row.entityId) : null, entityLabel: maskPrivateText(row.entityLabel),
    data: sanitizeAuditData(row.data) })) };
}
