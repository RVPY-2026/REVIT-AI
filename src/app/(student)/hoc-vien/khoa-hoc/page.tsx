import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getMyLearning } from "@/lib/api/student-area";
import { formatDate } from "@/lib/format";
import { lessonLabel, TRIAL_LESSON_COUNT } from "@/lib/student-learning";
import type { MyPlanLesson } from "@/lib/schemas/student-area";
import { LessonStateBadge } from "@/components/student/LessonStateBadge";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Bài học · Khu học viên", robots: { index: false, follow: false } };

const PHASE_LABELS = { foundation: "Giai đoạn nền tảng", specialist: "Giai đoạn chuyên đề" } as const;

export default function LessonsPage() {
  return <Suspense fallback={<StudentPageSkeleton />}><LessonsPageContent /></Suspense>;
}

async function LessonsPageContent() {
  const learning = await getMyLearning();
  if (!learning) return <NoLearningRecord />;
  const { enrollment, lessons } = learning;
  const phases = (["foundation", "specialist"] as const)
    .map((phase) => ({ phase, items: lessons.filter((lesson) => lesson.phase === phase) }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow="Bài học"
        title="Chương trình học Revit"
        description={enrollment?.kind === "trial"
          ? `Bạn đang học thử ${TRIAL_LESSON_COUNT} bài đầu tiên. Các bài còn lại mở khi bạn học chính thức.`
          : "Chọn một bài để xem video, tài liệu và báo hoàn thành."}
      />

      {phases.length === 0 ? (
        <section className="rounded-[4px] border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-medium">Chưa có bài học nào</h2>
          <p className="mt-2 text-sm text-muted-foreground">Các bài học sẽ hiện ở đây khi RVPY mở quyền học cho bạn.</p>
        </section>
      ) : phases.map(({ phase, items }) => (
        <section key={phase} aria-labelledby={`phase-${phase}`} className="revit-panel [--panel-pad:0.5rem] md:[--panel-pad:1rem]">
          {phases.length > 1 ? <h2 id={`phase-${phase}`} className="px-2 pt-2 pb-1 text-[21px] font-medium md:px-2">{PHASE_LABELS[phase]}</h2> : <h2 id={`phase-${phase}`} className="sr-only">{PHASE_LABELS[phase]}</h2>}
          <ul className="divide-y divide-border">
            {items.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} />)}
          </ul>
        </section>
      ))}
    </main>
  );
}

function LessonRow({ lesson }: { lesson: MyPlanLesson }) {
  const body = (
    <>
      <span className="w-16 shrink-0 font-mono text-[13px] text-muted-foreground">{lessonLabel(lesson.lessonNumbers)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{lesson.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          {lesson.trialOrder !== null ? <Badge variant="soft" className="px-2.5 py-0.5 text-xs">Học thử</Badge> : null}
          {lesson.dueDate ? <span>Hạn {formatDate(lesson.dueDate)}</span> : null}
        </span>
      </span>
      <LessonStateBadge state={lesson.state} locked={!lesson.accessible} />
      {lesson.accessible ? <ChevronRight aria-hidden size={18} strokeWidth={1.75} className="shrink-0 text-muted-foreground" /> : null}
    </>
  );
  return (
    <li>
      {lesson.accessible
        ? <Link href={`/hoc-vien/khoa-hoc/${lesson.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] px-2 py-3 hover:bg-primary-soft">{body}</Link>
        : <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-2 py-3 text-muted-foreground">{body}</div>}
    </li>
  );
}
