import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getMyLearning, listMyLessonResources } from "@/lib/api/student-area";
import { planLessonIdSchema } from "@/lib/schemas/student-area";
import { formatDate } from "@/lib/format";
import { lessonLabel } from "@/lib/student-learning";
import { LessonReportForm } from "@/components/student/LessonReportForm";
import { LessonStateBadge } from "@/components/student/LessonStateBadge";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { ResourceViewer } from "@/components/student/ResourceViewer";
import { PropertiesPalette } from "@/components/student/PropertiesPalette";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Bài học · Khu học viên", robots: { index: false, follow: false } };

export default function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  return <Suspense fallback={<StudentPageSkeleton />}><LessonPageContent params={params} /></Suspense>;
}

async function LessonPageContent({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson: lessonId } = await params;
  if (!planLessonIdSchema.safeParse(lessonId).success) notFound();
  const learning = await getMyLearning();
  if (!learning) return <NoLearningRecord />;

  // Only the caller's own plan is searched, so another student's lesson id is simply "not found".
  const index = learning.lessons.findIndex((item) => item.id === lessonId);
  if (index < 0) notFound();
  const lesson = learning.lessons[index];
  const previous = learning.lessons[index - 1];
  const next = learning.lessons[index + 1];

  if (!lesson.accessible) {
    return (
      <main className="content py-12 sm:py-16">
        <div className="mx-auto max-w-md rounded-[4px] border border-border bg-card p-6 text-center">
          <p className="font-mono text-xs text-muted-foreground uppercase">{lessonLabel(lesson.lessonNumbers)}</p>
          <h1 className="mt-2 font-heading text-xl font-medium">{lesson.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Bài này mở khi bạn học chính thức. Trong thời gian học thử, bạn học 3 bài đầu tiên.</p>
          <Button asChild variant="outline" className="mt-5"><Link href="/hoc-vien/khoa-hoc">Về danh sách bài học</Link></Button>
        </div>
      </main>
    );
  }

  const resources = await listMyLessonResources(lesson.id, lesson.title);

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow={`${lessonLabel(lesson.lessonNumbers)}${lesson.trialOrder !== null ? " · Bài học thử" : ""}`}
        title={lesson.title}
        description={lesson.dueDate ? `Hạn dự kiến ${formatDate(lesson.dueDate)}` : undefined}
        action={<LessonStateBadge state={lesson.state} />}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="grid gap-6">
      <section aria-labelledby="materials-heading" className="grid gap-4">
        <h2 id="materials-heading" className="text-[21px] font-medium">Video và tài liệu</h2>
        {resources.length ? resources.map((resource) => (
          <figure key={resource.id} className="grid gap-2">
            <ResourceViewer resource={resource} />
            <figcaption className="text-sm text-muted-foreground">{resource.title}</figcaption>
          </figure>
        )) : (
          <p className="rounded-[4px] border border-border bg-card p-5 text-sm text-muted-foreground">Bài này chưa có video hoặc tài liệu. RVPY sẽ bổ sung trước buổi học.</p>
        )}
      </section>

      <section aria-labelledby="report-heading" className="revit-panel">
        <h2 id="report-heading" className="text-[21px] font-medium">Báo hoàn thành</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Sau khi làm xong bài, bạn báo để RVPY xem và xác nhận.</p>
        <LessonReportForm
          key={`${lesson.id}-${lesson.reportedAt ?? ""}-${lesson.completedAt ?? ""}`}
          planLessonId={lesson.id}
          reportedAt={lesson.reportedAt}
          completedAt={lesson.completedAt}
          note={lesson.progressNote}
          submissionUrl={lesson.submissionUrl}
        />
      </section>

      <nav aria-label="Chuyển bài" className="flex flex-wrap justify-between gap-3">
        {previous?.accessible ? <Button asChild variant="outline"><Link href={`/hoc-vien/khoa-hoc/${previous.id}`}><ArrowLeft aria-hidden strokeWidth={1.75} />{lessonLabel(previous.lessonNumbers)}</Link></Button> : <span />}
        {next?.accessible ? <Button asChild variant="outline"><Link href={`/hoc-vien/khoa-hoc/${next.id}`}>{lessonLabel(next.lessonNumbers)}<ArrowRight aria-hidden strokeWidth={1.75} /></Link></Button> : <span />}
      </nav>
      </div>
      <PropertiesPalette rows={[
        { name: "Mã bài", value: <span className="font-mono">{lessonLabel(lesson.lessonNumbers)}</span> },
        { name: "Giai đoạn", value: lesson.phase === "foundation" ? "Nền tảng" : "Chuyên đề" },
        { name: "Loại", value: lesson.trialOrder !== null ? `Học thử · bài ${lesson.trialOrder}` : "Chính thức" },
        { name: "Hạn dự kiến", value: lesson.dueDate ? formatDate(lesson.dueDate) : "—" },
        { name: "Trạng thái", value: <LessonStateBadge state={lesson.state} /> },
        { name: "Đã báo lúc", value: lesson.reportedAt ? formatDate(lesson.reportedAt) : "—" },
        { name: "Xác nhận lúc", value: lesson.completedAt ? formatDate(lesson.completedAt) : "—" },
        { name: "Tài liệu", value: <span className="font-mono">{resources.length}</span> },
      ]} />
      </div>
    </main>
  );
}
