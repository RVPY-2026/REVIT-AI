import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getZaloQueue } from "@/lib/api/admin-sources-audit";
import { viewerFilterSchema } from "@/lib/schemas/admin-viewers";
import { USE_MOCK } from "@/lib/runtime-mode";
import { ZaloQueueList } from "@/components/admin/ZaloQueueList";
import { ZaloQueueRetry } from "@/components/admin/ZaloQueueRetry";
import { ViewerFilters } from "@/components/admin/ViewerFilters";
import { ViewerPagination } from "@/components/admin/ViewerPagination";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
import { ManagementLoading } from "@/components/admin/ManagementLoading";
import { ManagementEmpty } from "@/components/admin/ManagementEmpty";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/server/auth/session";
import { adminPreviewState } from "@/server/admin-preview-state";
export const metadata: Metadata = { title: "Hàng đợi Zalo · Quản lý RVPY", robots: { index: false, follow: false } };
export default function ZaloPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<ManagementLoading variant="queue" />}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("zalo.view"); const params = await searchParams; const parsed = viewerFilterSchema.safeParse(params);
  if (!parsed.success) return <main className="content space-y-5 py-8"><ManagementPageHeader title="Hàng đợi Zalo" helper="Bạn kiểm tra lại khoảng ngày trong bộ lọc." /><Button variant="outline" asChild><Link href="/quan-tri/zalo">Chọn lại bộ lọc</Link></Button></main>;
  const data = await getZaloQueue(parsed.data); const state = adminPreviewState(params);
  if (state === "error") throw new Error("Mock queue loading failure"); if (state === "loading") return <ManagementLoading variant="queue" />;
  const rows = state === "empty" ? [] : state === "one" ? data.rows.slice(0, 1) : state === "long" ? (await import("@/mocks/admin-sources-audit")).mockLongZaloRows.slice(0, 50) : data.rows;
  const summary = state === "empty" ? { pendingCount: 0, failedCount: 0, oldestPendingAt: null } : data.summary;
  const age = state === "empty" ? null : data.oldestPendingMinutes;
  const pendingAge = age === null ? "—" : age >= 1440 ? `${Math.floor(age / 1440).toLocaleString("vi-VN")} ngày` : age >= 60 ? `${Math.floor(age / 60).toLocaleString("vi-VN")} giờ` : `${age.toLocaleString("vi-VN")} phút`;
  return <main className="content py-8 sm:py-10"><ManagementPageHeader title="Hàng đợi Zalo" helper="Theo dõi tin nhắn và xếp lại những mục gửi lỗi."
    action={<ZaloQueueRetry failedCount={summary.failedCount} />} />
    {USE_MOCK && <p className="mt-5 text-sm text-muted-foreground">Chế độ xem thử · Dữ liệu minh họa. Chưa lưu thay đổi.</p>}
    {!data.configured && <p role="status" className="mt-5 rounded-lg border border-warning p-4 text-sm">Chưa đủ cấu hình gửi Zalo tự động. Bạn cần cấu hình kết nối Zalo và lịch gửi trước khi thử lại.</p>}
    <dl className="mt-5 grid grid-cols-3 gap-3">{[["Chờ gửi", summary.pendingCount], ["Chờ lâu nhất", pendingAge], ["Gửi lỗi", summary.failedCount]].map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl border bg-card p-3 sm:p-4"><dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt><dd className="mt-2 break-words font-mono text-base tabular-nums sm:text-lg">{value}</dd></div>)}</dl>
    <ViewerFilters filter={parsed.data} /><div className="mt-5">{rows.length ? <ZaloQueueList rows={rows} /> : <ManagementEmpty><p>Chưa có tin khớp bộ lọc. Bạn mở rộng khoảng ngày để xem thêm.</p><Button variant="outline" asChild><Link href="/quan-tri/zalo">Xóa bộ lọc</Link></Button></ManagementEmpty>}</div>
    <ViewerPagination total={state === "empty" ? 0 : state === "one" ? 1 : data.total} page={data.page} /></main>;
}
