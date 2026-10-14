import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Eye, FileText, PlayCircle } from "lucide-react";
import { getMyLearning, listMyResources } from "@/lib/api/student-area";
import { resourceIdSchema, type MyResource } from "@/lib/schemas/student-area";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { ResourceViewer } from "@/components/student/ResourceViewer";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { IconTile } from "@/components/ui/icon-tile";

export const metadata: Metadata = { title: "Tài liệu · Khu học viên", robots: { index: false, follow: false } };

const GENERAL = "Tài liệu chung";

export default function MaterialsPage({ searchParams }: { searchParams: Promise<{ xem?: string | string[] }> }) {
  return <Suspense fallback={<StudentPageSkeleton />}><MaterialsPageContent searchParams={searchParams} /></Suspense>;
}

async function MaterialsPageContent({ searchParams }: { searchParams: Promise<{ xem?: string | string[] }> }) {
  const [{ xem }, learning] = await Promise.all([searchParams, getMyLearning()]);
  if (!learning) return <NoLearningRecord />;

  // Downloads (installers) live on the software page; this page is view-only.
  const resources = (await listMyResources()).filter((resource) => resource.mode === "view");
  const requested = typeof xem === "string" && resourceIdSchema.safeParse(xem).success ? xem : null;
  // The viewer only opens something already in the caller's own list.
  const selected = resources.find((resource) => resource.id === requested) ?? null;

  const groups = new Map<string, MyResource[]>();
  for (const resource of resources) {
    const key = resource.lessonTitle ?? GENERAL;
    groups.set(key, [...(groups.get(key) ?? []), resource]);
  }

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow="Tài liệu"
        title="Tài liệu học tập"
        description="Tài liệu chỉ xem trực tuyến, không tải về. Vui lòng không chia sẻ ra ngoài."
      />

      {selected ? (
        <section aria-labelledby="viewer-heading" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="viewer-heading" className="text-[21px] font-medium">{selected.title}</h2>
            <Link href="/hoc-vien/tai-lieu" scroll={false} className="text-sm text-primary underline-offset-4 hover:underline">Đóng</Link>
          </div>
          <ResourceViewer resource={selected} />
        </section>
      ) : null}

      {resources.length === 0 ? (
        <section className="rounded-[4px] border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-medium">Chưa có tài liệu nào</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tài liệu và video sẽ hiện ở đây khi RVPY đăng lên. Bạn xem thêm ở nhóm Zalo cộng đồng nhé.</p>
        </section>
      ) : [...groups].map(([title, items], index) => (
        <section key={title} aria-labelledby={`group-${index}`} className="revit-panel [--panel-pad:0.5rem] md:[--panel-pad:1rem]">
          <h2 id={`group-${index}`} className="px-2 pt-2 pb-1 text-[18px] font-medium">{title}</h2>
          <ul className="divide-y divide-border">
            {items.map((resource) => (
              <li key={resource.id}>
                <Link href={`/hoc-vien/tai-lieu?xem=${resource.id}`} scroll={false} aria-current={selected?.id === resource.id ? "true" : undefined}
                  className={`flex min-h-14 items-center gap-3 rounded-[10px] px-2 py-3 hover:bg-primary-soft ${selected?.id === resource.id ? "bg-primary-soft" : ""}`}>
                  <IconTile size="sm" icon={resource.format === "youtube" ? PlayCircle : FileText} />
                  <span className="min-w-0 flex-1 font-medium">{resource.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground"><Eye aria-hidden size={16} strokeWidth={1.75} />Xem</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
