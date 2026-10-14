import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getMyLearning } from "@/lib/api/student-area";
import { formatDate } from "@/lib/format";
import { lessonLabel, summarizeProgress } from "@/lib/student-learning";
import { LessonStateBadge } from "@/components/student/LessonStateBadge";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { ProgressBar } from "@/components/student/ProgressBar";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";

export const metadata: Metadata = { title: "Tiến độ · Khu học viên", robots: { index: false, follow: false } };

export default function ProgressPage() {
  return <Suspense fallback={<StudentPageSkeleton />}><ProgressPageContent /></Suspense>;
}

async function ProgressPageContent() {
  const learning = await getMyLearning();
  if (!learning) return <NoLearningRecord />;
  const { enrollment, lessons } = learning;
  const trial = enrollment?.kind === "trial";
  // A trial student is tracked on the three trial lessons; the full plan opens with formal enrollment.
  const rows = trial ? lessons.filter((lesson) => lesson.trialOrder !== null) : lessons;
  const progress = summarizeProgress(lessons, enrollment?.kind ?? null);
  const remaining = progress.total - progress.completed - progress.reported;
  const hasDates = rows.some((lesson) => lesson.dueDate);

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow="Tiến độ"
        title="Tiến độ học của bạn"
        description={trial ? "Theo dõi 3 bài học thử. Lộ trình đầy đủ mở khi bạn học chính thức." : "Theo dõi từng bài trong lộ trình và hạn dự kiến."}
      />

      {!enrollment || rows.length === 0 ? (
        <section className="rounded-[4px] border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-medium">Chưa có lộ trình học</h2>
          <p className="mt-2 text-sm text-muted-foreground">Lộ trình và tiến độ sẽ hiện ở đây khi RVPY mở quyền học cho bạn.</p>
        </section>
      ) : (
        <>
          <section aria-labelledby="summary-heading" className="revit-panel">
            <h2 id="summary-heading" className="sr-only">Tóm tắt tiến độ</h2>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="font-mono text-[40px] leading-none tabular-nums">{progress.percent}%</p>
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div><dt className="text-muted-foreground">Đã hoàn thành</dt><dd className="font-mono text-[21px] tabular-nums">{progress.completed}</dd></div>
                <div><dt className="text-muted-foreground">Chờ xác nhận</dt><dd className="font-mono text-[21px] tabular-nums">{progress.reported}</dd></div>
                <div><dt className="text-muted-foreground">Còn lại</dt><dd className="font-mono text-[21px] tabular-nums">{remaining}</dd></div>
              </dl>
            </div>
            <ProgressBar value={progress.percent} label="Tiến độ học" className="mt-4" />
          </section>

          <section aria-labelledby="table-heading" className="revit-panel [--panel-pad:0.5rem] md:[--panel-pad:1rem]">
            <h2 id="table-heading" className="sr-only">Chi tiết từng bài</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Tiến độ từng bài học trong lộ trình của bạn</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="px-2 py-3 font-medium">Bài</th>
                    <th scope="col" className="px-2 py-3 font-medium">Nội dung</th>
                    {hasDates ? <th scope="col" className="px-2 py-3 text-right font-medium">Hạn dự kiến</th> : null}
                    <th scope="col" className="px-2 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((lesson) => (
                    <tr key={lesson.id}>
                      <th scope="row" className="px-2 py-3 font-mono text-[13px] font-normal whitespace-nowrap text-muted-foreground">{lessonLabel(lesson.lessonNumbers)}</th>
                      <td className="px-2 py-3"><Link href={`/hoc-vien/khoa-hoc/${lesson.id}`} className="hover:text-primary">{lesson.title}</Link></td>
                      {hasDates ? <td className="px-2 py-3 text-right font-mono text-[13px] whitespace-nowrap tabular-nums">{lesson.dueDate ? formatDate(lesson.dueDate) : "—"}</td> : null}
                      <td className="px-2 py-3"><LessonStateBadge state={lesson.state} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
