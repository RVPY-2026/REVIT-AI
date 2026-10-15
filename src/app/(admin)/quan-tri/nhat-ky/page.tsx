import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAuditLog } from "@/lib/api/admin-sources-audit";
import { viewerFilterSchema } from "@/lib/schemas/admin-viewers";
import { USE_MOCK } from "@/lib/runtime-mode";
import { AuditLogList } from "@/components/admin/AuditLogList";
import { ViewerFilters } from "@/components/admin/ViewerFilters";
import { ViewerPagination } from "@/components/admin/ViewerPagination";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
import { ManagementRefreshButton } from "@/components/admin/ManagementRefreshButton";
import { ManagementLoading } from "@/components/admin/ManagementLoading";
import { ManagementEmpty } from "@/components/admin/ManagementEmpty";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/server/auth/session";
import { adminPreviewState } from "@/server/admin-preview-state";
export const metadata: Metadata = { title: "Nhật ký hoạt động · Quản lý RVPY", robots: { index: false, follow: false } };
export default function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<ManagementLoading variant="audit" />}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("audit.view"); const params = await searchParams; const parsed = viewerFilterSchema.safeParse(params);
  if (!parsed.success) return <main className="content space-y-5 py-8"><ManagementPageHeader title="Nhật ký hoạt động" helper="Bạn kiểm tra lại khoảng ngày và từ khóa trong bộ lọc." /><Button variant="outline" asChild><Link href="/quan-tri/nhat-ky">Chọn lại bộ lọc</Link></Button></main>;
  const data = await getAuditLog(parsed.data); const state = adminPreviewState(params);
  if (state === "error") throw new Error("Mock audit loading failure"); if (state === "loading") return <ManagementLoading variant="audit" />;
  const rows = state === "empty" ? [] : state === "one" ? data.rows.slice(0, 1) : state === "long" ? (await import("@/mocks/admin-sources-audit")).mockLongAuditRows.slice(0, 50) : data.rows;
  return <main className="content py-8 sm:py-10"><ManagementPageHeader title="Nhật ký hoạt động" helper="Xem thay đổi theo người thực hiện, thời gian và hồ sơ." action={<ManagementRefreshButton label="Tải lại nhật ký" />} />
    {USE_MOCK && <p className="mt-5 text-sm text-muted-foreground">Chế độ xem thử · Dữ liệu minh họa.</p>}
    <ViewerFilters filter={parsed.data} audit /><div className="mt-5">{rows.length ? <AuditLogList rows={rows} /> : <ManagementEmpty><p>Chưa có hoạt động khớp bộ lọc. Bạn mở rộng khoảng ngày để tìm thêm.</p><Button variant="outline" asChild><Link href="/quan-tri/nhat-ky">Xóa bộ lọc</Link></Button></ManagementEmpty>}</div>
    <ViewerPagination total={state === "empty" ? 0 : state === "one" ? 1 : data.total} page={data.page} /></main>;
}
