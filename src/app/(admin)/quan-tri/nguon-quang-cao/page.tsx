import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdSources } from "@/lib/api/admin-sources-audit";
import { USE_MOCK } from "@/lib/runtime-mode";
import { AdSourceList } from "@/components/admin/AdSourceList";
import { AdSourceDialog } from "@/components/admin/AdSourceDialog";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
import { ManagementLoading } from "@/components/admin/ManagementLoading";
import { adminPreviewState } from "@/server/admin-preview-state";
export const metadata: Metadata = { title: "Nguồn quảng cáo · Quản lý RVPY", robots: { index: false, follow: false } };
export default function SourcesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<ManagementLoading />}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getAdSources(); const state = adminPreviewState(await searchParams);
  if (state === "error") throw new Error("Mock source loading failure");
  if (state === "loading") return <ManagementLoading />;
  const rows = state === "empty" ? [] : state === "one" ? data.rows.slice(0, 1) : state === "long" ? (await import("@/mocks/admin-sources-audit")).mockLongAdSources : data.rows;
  return <main className="content py-8 sm:py-10"><ManagementPageHeader title="Nguồn quảng cáo" helper="Gán người phụ trách và theo dõi hồ sơ từ từng nguồn."
    action={<AdSourceDialog owners={data.owners} usedCodes={data.rows.map((r) => r.code)} />} />
    {USE_MOCK && <p className="mt-5 text-sm text-muted-foreground">Chế độ xem thử · Dữ liệu minh họa. Chưa lưu thay đổi.</p>}
    <AdSourceList rows={rows} owners={data.owners} /></main>;
}
