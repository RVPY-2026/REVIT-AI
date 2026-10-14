"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, GraduationCap, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CHECKLIST_FIELDS, CHECKLIST_LABELS, activateStudentSchema, type StudentOnboarding } from "@/lib/schemas/student-onboarding";
import { formatDate, formatDateTime } from "@/lib/format";
import { isSafeHttpsUrl } from "@/lib/student-learning";
import { openTrialEnrollment } from "@/server/actions/enrollments";
import { activateStudent, updateStudentChecklist, confirmTrialLesson, retryZaloMessages } from "@/server/actions/student-onboarding";
import type { ActionResult } from "@/server/result";

type Confirmation = { title: string; description: string; label: string; success: string; run: () => Promise<ActionResult<{ id: string }>> };
export function StudentOnboardingPanel({ data, contactEmail, canOpenTrial, canActivate, canEdit, preview = false }: {
  data: StudentOnboarding; contactEmail: string | null; canOpenTrial: boolean; canActivate: boolean; canEdit: boolean; preview?: boolean;
}) {
  const router = useRouter();
  const emailId = useId();
  const [email, setEmail] = useState(data.account?.email ?? contactEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [pending, startTransition] = useTransition();
  const blocked = pending || preview;
  const enrollmentActive = data.enrollment?.status === "active";
  const completed = data.lessons.filter((lesson) => lesson.completedAt).length;

  function save(run: Confirmation["run"], message: string) {
    if (blocked) return;
    startTransition(async () => {
      try {
        const result = await run();
        if (!result.ok) { setError(result.error); toast.error(result.error); router.refresh(); return; }
        setError(null); setConfirmation(null); toast.success(message); router.refresh();
      } catch { setError("Chưa thể lưu. Bạn thử lại sau nhé."); toast.error("Chưa thể lưu. Bạn thử lại sau nhé."); }
    });
  }
  function requestActivation() {
    const parsed = activateStudentSchema.safeParse({ studentId: data.studentId, loginEmail: email });
    if (!parsed.success) { setError("Bạn nhập email đăng nhập hợp lệ nhé."); return; }
    setError(null);
    setConfirmation({ title: "Cấp quyền học viên?", description: `Tài khoản ${parsed.data.loginEmail} sẽ được gắn với hồ sơ này và xem nội dung theo lượt học. Học viên đăng nhập bằng Google hoặc liên kết email với đúng địa chỉ này.`, label: "Cấp quyền học viên", success: "Đã kích hoạt tài khoản học viên", run: () => activateStudent(parsed.data) });
  }

  return <>
    <Card className="min-w-0">
      <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap aria-hidden="true" size={18} strokeWidth={1.75} />Học thử & tài khoản</CardTitle></CardHeader>
      <CardContent className="grid gap-5">
        {preview && <p className="text-sm text-muted-foreground">Dữ liệu minh họa. Chế độ xem thử chưa lưu thay đổi.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
          <p className="text-sm text-muted-foreground">{data.zalo.connected ? "Đã kết nối Bot Zalo" : "Chưa kết nối Bot Zalo"}</p>
          {data.zalo.pendingCount > 0 && <p role="status" className="text-xs text-muted-foreground">{data.zalo.pendingCount} tin đang chờ gửi{data.zalo.oldestPendingAt && ` · từ ${formatDateTime(data.zalo.oldestPendingAt)}`}</p>}
          {data.zalo.failedCount > 0 && <div className="flex items-center gap-2">
            <p role="status" className="text-xs text-destructive">{data.zalo.failedCount} tin chưa gửi được</p>
            {canEdit && <Button type="button" variant="outline" size="sm" disabled={blocked}
              onClick={() => save(() => retryZaloMessages({ studentId: data.studentId }), "Đã thử gửi lại tin Zalo")}>Gửi lại</Button>}
          </div>}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">{data.enrollment ? `${data.enrollment.kind === "trial" ? "Học thử" : "Học chính thức"} · ${data.enrollment.status === "active" ? "Đang hoạt động" : data.enrollment.status === "paused" ? "Tạm dừng" : data.enrollment.status === "completed" ? "Đã hoàn thành" : "Đã hủy"}` : "Chưa mở lượt học"}</p>
            {data.enrollment?.trialStartedAt && <p className="text-xs text-muted-foreground">Học thử từ {formatDate(data.enrollment.trialStartedAt)}{data.enrollment.trialEndsAt && ` · hết 9 ngày vào ${formatDate(data.enrollment.trialEndsAt)}`}</p>}
            {!data.enrollment && <p className="text-sm text-muted-foreground">Mở học thử để tạo lộ trình và theo dõi ba bài học.</p>}
          </div>
          {canOpenTrial && (!data.enrollment || (data.enrollment.kind === "trial" && !enrollmentActive)) && <Button disabled={blocked} size="sm" onClick={() => setConfirmation({
            title: data.enrollment ? "Mở lại lượt học thử?" : "Xác nhận học thử?",
            description: "Học viên được chuyển sang đang học thử và có lộ trình riêng. Khi mở lại, tiến độ và ngày bắt đầu cũ được giữ nguyên. Nếu đã kết nối Bot Zalo và cài ảnh cảm ơn, hệ thống sẽ gửi ảnh sau khi xác nhận.",
            label: data.enrollment ? "Mở lại học thử" : "Xác nhận học thử", success: "Đã xác nhận học thử", run: () => openTrialEnrollment({ studentId: data.studentId }),
          })}>{data.enrollment ? "Mở lại học thử" : "Xác nhận học thử"}</Button>}
        </div>

        {canActivate && <div className="grid gap-3 border-t border-border pt-4">
          <h3 className="flex items-center gap-2 text-sm font-medium"><KeyRound aria-hidden="true" size={16} strokeWidth={1.75} />Tài khoản đăng nhập</h3>
          {data.account ? <div className="grid gap-2">
            <p className="break-all text-sm">{data.account.email}</p>
            <p className={`text-xs ${data.account.active ? "text-success" : "text-muted-foreground"}`}>{data.account.active ? "Đã cấp quyền học viên" : "Tài khoản chưa hoạt động. Kiểm tra quyền hoặc tình trạng vô hiệu hóa."}</p>
            {!data.account.active && <Button className="w-fit" variant="outline" size="sm" disabled={blocked || !enrollmentActive} onClick={requestActivation}>Cấp quyền học viên</Button>}
          </div> : <div className="grid gap-2">
            <label htmlFor={emailId} className="text-sm">Email đăng nhập</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id={emailId} type="email" autoComplete="off" value={email} disabled={pending} onChange={(event) => setEmail(event.target.value)} placeholder="hocvien@example.com" className="min-w-0 flex-1" />
              <Button variant="outline" size="sm" disabled={blocked || !enrollmentActive} onClick={requestActivation}>Cấp quyền học viên</Button>
            </div>
            <p className="text-xs text-muted-foreground">{enrollmentActive ? "Dùng đúng email học viên sẽ đăng nhập. Sửa email liên hệ không đổi tài khoản đã gắn." : "Bạn mở học thử trước khi cấp quyền đăng nhập."}</p>
          </div>}
        </div>}

        <div className="grid gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">Checklist chuẩn bị</h3>
          {CHECKLIST_FIELDS.map((field) => <div key={field} className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-sm">{CHECKLIST_LABELS[field]}</p>{data.checklist[field] && <p className="text-xs text-muted-foreground">{formatDateTime(data.checklist[field]!)}</p>}</div>
            {canEdit ? <Button variant={data.checklist[field] ? "outline" : "ghost"} size="sm" aria-pressed={Boolean(data.checklist[field])} aria-label={`${data.checklist[field] ? "Bỏ đánh dấu" : "Đánh dấu"}: ${CHECKLIST_LABELS[field]}`} disabled={blocked}
              onClick={() => save(() => updateStudentChecklist({ studentId: data.studentId, field, done: !data.checklist[field], expectedAt: data.checklist[field] }), "Đã cập nhật checklist")}>
              {data.checklist[field] && <Check aria-hidden="true" size={16} strokeWidth={1.75} />}{data.checklist[field] ? "Đã xong" : "Đánh dấu"}
            </Button> : <span className="shrink-0 text-xs text-muted-foreground">{data.checklist[field] ? "Đã xong" : "Chưa xong"}</span>}
          </div>)}
        </div>

        <div className="grid gap-3 border-t border-border pt-4">
          <h3 className="text-sm font-medium">Ba bài học thử{data.lessons.length > 0 && ` · ${completed}/3 đã xác nhận`}</h3>
          {!data.lessons.length ? <p className="text-sm text-muted-foreground">Chưa có lộ trình học thử. Bạn mở học thử để tạo ba bài học.</p> : data.lessons.map((lesson) => <div key={lesson.id} className="grid gap-2 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">Buổi {lesson.trialOrder} · {lesson.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{lesson.completedAt ? `Đã xác nhận ${formatDateTime(lesson.completedAt)}` : lesson.reportedAt ? `Chờ xác nhận · báo xong ${formatDateTime(lesson.reportedAt)}` : "Chưa báo hoàn thành"}</p>
              </div>
              {canEdit && <Button variant="outline" size="sm" disabled={blocked || !enrollmentActive} onClick={() => setConfirmation({
                title: lesson.completedAt ? "Bỏ xác nhận hoàn thành?" : "Xác nhận hoàn thành bài học?",
                description: `Buổi ${lesson.trialOrder}: ${lesson.title}. ${lesson.completedAt ? "Bài học sẽ trở lại trạng thái trước khi xác nhận." : lesson.reportedAt ? "Bạn đã kiểm tra bài học viên gửi và xác nhận hoàn thành." : "Học viên chưa báo xong trên web. Bạn vẫn có thể xác nhận nếu đã kiểm tra buổi học trực tiếp."}`,
                label: lesson.completedAt ? "Bỏ xác nhận" : "Xác nhận hoàn thành", success: "Đã cập nhật tiến độ học thử",
                run: () => confirmTrialLesson({ studentId: data.studentId, planLessonId: lesson.id, completed: !lesson.completedAt, expectedCompletedAt: lesson.completedAt, expectedReportedAt: lesson.reportedAt }),
              })}>{lesson.completedAt ? "Bỏ xác nhận" : "Xác nhận"}</Button>}
            </div>
            {lesson.progressNote && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{lesson.progressNote}</p>}
            {lesson.submissionUrl && isSafeHttpsUrl(lesson.submissionUrl) && <a href={lesson.submissionUrl} target="_blank" rel="noreferrer" className="w-fit text-sm text-primary underline underline-offset-4">Xem bài học viên gửi</a>}
          </div>)}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {pending && <p role="status" className="text-xs text-muted-foreground">Đang lưu…</p>}
      </CardContent>
    </Card>
    <AlertDialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !pending) setConfirmation(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmation?.title}</AlertDialogTitle><AlertDialogDescription>{confirmation?.description}</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={pending}>Giữ nguyên</AlertDialogCancel><AlertDialogAction disabled={blocked} onClick={(event) => { event.preventDefault(); if (confirmation) save(confirmation.run, confirmation.success); }}>{pending ? "Đang lưu…" : confirmation?.label}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
