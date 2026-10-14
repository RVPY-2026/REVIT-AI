import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { getMyLearning } from "@/lib/api/student-area";
import { ZALO_GROUPS, ZALO_REGISTRATION_CONTACT } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { daysUntil, lessonLabel, nextLesson, summarizeProgress, TRIAL_LESSON_COUNT } from "@/lib/student-learning";
import { NoLearningRecord } from "@/components/student/NoLearningRecord";
import { StudentPageSkeleton } from "@/components/student/StudentPageSkeleton";
import { ProgressBar } from "@/components/student/ProgressBar";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Khu học viên", robots: { index: false, follow: false } };

export default function StudentOverviewPage() {
  return <Suspense fallback={<StudentPageSkeleton />}><StudentOverviewPageContent /></Suspense>;
}

async function StudentOverviewPageContent() {
  const learning = await getMyLearning();
  if (!learning) return <NoLearningRecord />;
  const { student, enrollment, lessons, licenses } = learning;
  const progress = summarizeProgress(lessons, enrollment?.kind ?? null);
  const next = nextLesson(lessons);
  const trialLeft = enrollment?.trialEndsAt ? daysUntil(enrollment.trialEndsAt) : null;
  const trialLessonsDone = lessons.filter((lesson) => lesson.trialOrder !== null && lesson.state === "completed").length;
  const license = licenses.find((item) => item.status === "active") ?? licenses[0];

  // Formal students are past the trial, so its three-lesson step no longer applies to them.
  const checklist = [
    { done: true, label: "Đăng ký khoá học" },
    { done: Boolean(student.group1At && student.group2At), label: "Tham gia 2 nhóm Zalo cộng đồng", href: "/hoc-vien/ho-tro", cta: "Xem nhóm" },
    { done: Boolean(student.softwareReadyAt), label: "Cài phần mềm và add-in", href: "/hoc-vien/phan-mem", cta: "Hướng dẫn cài" },
    ...(enrollment?.kind === "formal" ? [] : [{ done: trialLessonsDone >= TRIAL_LESSON_COUNT, label: `Học ${TRIAL_LESSON_COUNT} bài học thử (${Math.min(trialLessonsDone, TRIAL_LESSON_COUNT)}/${TRIAL_LESSON_COUNT})`, href: "/hoc-vien/khoa-hoc", cta: "Vào bài học" }]),
  ];

  return (
    <main className="content grid gap-6 py-8 sm:py-10">
      <StudentPageHeader
        eyebrow={`Mã học viên · ${student.code}`}
        title={`Chào ${student.fullName}`}
        description="Tổng quan việc học của bạn tại RVPY Ocean Studio."
      />

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="path-heading" className="min-w-0 revit-panel">
          <div className="revit-panel-head flex flex-wrap items-center justify-between gap-3">
            <h2 id="path-heading" className="text-[21px] font-medium">Lộ trình của bạn</h2>
            {enrollment ? <Badge variant={enrollment.kind === "formal" ? "success" : "warning"}>{enrollment.kind === "formal" ? "Học chính thức" : "Đang học thử"}</Badge> : <Badge variant="muted">Chưa mở học</Badge>}
          </div>

          {enrollment ? (
            <>
              {enrollment.kind === "trial" && trialLeft !== null ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {trialLeft >= 0
                    ? `Còn ${trialLeft} ngày trong 9 ngày học thử, đến hết ${formatDate(enrollment.trialEndsAt!)}.`
                    : `9 ngày học thử đã kết thúc ngày ${formatDate(enrollment.trialEndsAt!)}. Bạn nhắn Zalo để RVPY tư vấn đăng ký học chính thức.`}
                </p>
              ) : null}
              <div className="mt-5 flex items-baseline justify-between gap-3">
                <p className="text-sm text-muted-foreground">{enrollment.kind === "trial" ? "Bài học thử đã hoàn thành" : "Bài học đã hoàn thành"}</p>
                <p className="font-mono text-[21px] tabular-nums">{progress.completed}/{progress.total}</p>
              </div>
              <ProgressBar value={progress.percent} label="Tiến độ học" className="mt-2" />
              {progress.reported > 0 ? <p className="mt-2 text-[13px] text-muted-foreground">{progress.reported} bài đang chờ RVPY xác nhận.</p> : null}

              <div className="mt-6 border-t border-border pt-5">
                {next ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground uppercase">Bài tiếp theo</p>
                      <p className="mt-1 font-medium"><span className="font-mono text-[13px] text-muted-foreground">{lessonLabel(next.lessonNumbers)}</span> · {next.title}</p>
                      {next.dueDate ? <p className="mt-0.5 text-[13px] text-muted-foreground">Hạn dự kiến {formatDate(next.dueDate)}</p> : null}
                    </div>
                    <Button asChild><Link href={`/hoc-vien/khoa-hoc/${next.id}`}>Vào học <ArrowRight aria-hidden strokeWidth={1.75} /></Link></Button>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm"><CheckCircle2 aria-hidden size={18} strokeWidth={1.75} className="text-success" />Bạn đã hoàn thành mọi bài đang mở.</p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-3 grid gap-4">
              <p className="text-sm text-muted-foreground">Lộ trình học sẽ hiện ở đây khi RVPY mở quyền học thử cho bạn. Bạn nhắn Zalo nếu cần hỏi lịch.</p>
              <div><Button asChild variant="outline"><a href={ZALO_REGISTRATION_CONTACT.href} target="_blank" rel="noopener noreferrer">Nhắn Zalo cho RVPY <ExternalLink aria-hidden strokeWidth={1.75} /></a></Button></div>
            </div>
          )}
        </section>

        <section aria-labelledby="checklist-heading" className="min-w-0 revit-panel">
          <h2 id="checklist-heading" className="text-[21px] font-medium">Bắt đầu học</h2>
          <ol className="mt-3 divide-y divide-border">
            {checklist.map((step) => (
              <li key={step.label} className="flex items-center gap-3 py-3">
                {step.done
                  ? <CheckCircle2 aria-hidden size={20} strokeWidth={1.75} className="shrink-0 text-success" />
                  : <Circle aria-hidden size={20} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1 text-sm">{step.label}<span className="sr-only">{step.done ? " — đã xong" : " — chưa xong"}</span></span>
                {!step.done && step.href ? <Link href={step.href} className="shrink-0 text-sm text-primary underline-offset-4 hover:underline">{step.cta}</Link> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="license-heading" className="min-w-0 revit-panel">
          <div className="revit-panel-head flex flex-wrap items-center justify-between gap-3">
            <h2 id="license-heading" className="text-[21px] font-medium">Add-in Revit</h2>
            {license ? <Badge variant={license.status === "active" ? "success" : "destructive"}>{license.status === "active" ? "Đang hiệu lực" : license.status === "expired" ? "Đã hết hạn" : "Đã thu hồi"}</Badge> : <Badge variant="muted">Chưa kích hoạt</Badge>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {license
              ? license.expiresAt ? `Giấy phép ${license.status === "active" ? "có hiệu lực đến" : "hết hạn từ"} ${formatDate(license.expiresAt)}.` : "Giấy phép không giới hạn thời gian."
              : "Giấy phép được cấp theo Gmail của bạn. Bạn nhắn RVPY khi cần kích hoạt."}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/hoc-vien/phan-mem">Tải và cài đặt</Link></Button>
        </section>

        <section aria-labelledby="community-heading" className="min-w-0 revit-panel">
          <h2 id="community-heading" className="text-[21px] font-medium">Cộng đồng Zalo</h2>
          <p className="mt-2 text-sm text-muted-foreground">Hỏi đáp khi học, tài liệu mới và thông báo sự kiện. Bạn nên tham gia cả hai nhóm.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ZALO_GROUPS.map((group) => (
              <Button key={group.href} asChild variant="outline" size="sm"><a href={group.href} target="_blank" rel="noopener noreferrer">{group.label} <ExternalLink aria-hidden strokeWidth={1.75} /></a></Button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
