import "server-only";
import { USE_MOCK, requirePermission } from "@/server/auth/session";
import { viewerDates, viewerFilterSchema, type ViewerFilter } from "@/lib/schemas/admin-viewers";
const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 300));
export async function getAdSources() {
  const user = await requirePermission("sources.manage");
  if (USE_MOCK) { await delay(); const m = await import("@/mocks/admin-sources-audit"); return { rows: m.mockAdSources, owners: m.mockSourceOwners }; }
  const q = await import("@/server/queries/ad-sources");
  const [rows, owners] = await Promise.all([q.listAdSources(user), q.listSourceOwners(user)]);
  return { rows, owners };
}
export async function getAuditLog(input: ViewerFilter) {
  const user = await requirePermission("audit.view");
  const filter = viewerFilterSchema.parse(input);
  if (!USE_MOCK) return (await import("@/server/queries/audit-log")).listAuditLog(user, filter);
  await delay();
  const { mockAuditRows } = await import("@/mocks/admin-sources-audit");
  const dates = viewerDates(filter);
  const rows = mockAuditRows.filter((r) => (!filter.actor || r.actor.includes(filter.actor)) && (!filter.action || r.action === filter.action)
    && (!filter.entity || r.entity === filter.entity) && (!filter.search || r.entityId?.includes(filter.search))
    && (!dates.start || new Date(r.createdAt) >= dates.start) && (!dates.end || new Date(r.createdAt) < dates.end));
  const total = Math.min(rows.length, 10000);
  const pages = Math.max(1, Math.ceil(total / 50));
  const page = Math.min(filter.page, pages);
  return { rows: rows.slice((page - 1) * 50, page * 50), total, page, totalCapped: rows.length > 10000, hasNext: page < pages };
}
export async function getZaloQueue(input: ViewerFilter) {
  const user = await requirePermission("zalo.view");
  const filter = viewerFilterSchema.parse(input);
  if (!USE_MOCK) {
    const q = await import("@/server/queries/zalo-queue");
    const { serverEnv } = await import("@/server/env");
    const [list, summary] = await Promise.all([q.listZaloQueue(user, filter), q.getZaloQueueSummary(user)]);
    return { ...list, summary, oldestPendingMinutes: summary.oldestPendingAt ? Math.max(0, Math.floor((Date.now() - new Date(summary.oldestPendingAt).getTime()) / 60000)) : null, configured: Boolean(serverEnv.ZALO_BOT_TOKEN && serverEnv.CRON_SECRET) };
  }
  await delay();
  const { mockZaloRows } = await import("@/mocks/admin-sources-audit");
  const dates = viewerDates(filter);
  const rows = mockZaloRows.filter((r) => (!filter.status || r.status === filter.status)
    && (!dates.start || new Date(r.createdAt) >= dates.start) && (!dates.end || new Date(r.createdAt) < dates.end));
  const pending = mockZaloRows.filter((r) => r.status === "pending");
  const page = Math.min(filter.page, Math.max(1, Math.ceil(rows.length / 50)));
  return { rows: rows.slice((page - 1) * 50, page * 50), total: rows.length, page, configured: false, oldestPendingMinutes: 60,
    summary: { pendingCount: pending.length, failedCount: mockZaloRows.filter((r) => r.status === "failed").length,
      oldestPendingAt: pending.at(-1)?.createdAt ?? null } };
}
