"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { reportLessonSchema, type ReportLessonInput } from "@/lib/schemas/student-area";
import { reportLesson } from "@/server/actions/student-area";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  planLessonId: string;
  reportedAt: string | null;
  completedAt: string | null;
  note: string | null;
  submissionUrl: string | null;
};

/** Student side of progress: report a lesson as done (with optional note and link) or withdraw the report. */
export function LessonReportForm({ planLessonId, reportedAt, completedAt, note, submissionUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ReportLessonInput>({
    resolver: zodResolver(reportLessonSchema),
    defaultValues: { planLessonId, note: "", submissionUrl: "" },
  });

  function send(values: ReportLessonInput, success: string) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await reportLesson(values);
        if (!result.ok) {
          setServerError(result.error);
          toast.error(result.error);
          return;
        }
        toast.success(success);
        router.refresh();
      } catch {
        const message = "Chưa thể lưu lúc này. Bạn thử lại sau nhé.";
        setServerError(message);
        toast.error(message);
      }
    });
  }

  if (completedAt) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <CheckCircle2 aria-hidden size={18} strokeWidth={1.75} className="text-success" />
        RVPY đã xác nhận bạn hoàn thành bài này ngày {formatDate(completedAt)}.
      </p>
    );
  }

  if (reportedAt) {
    return (
      <div className="grid gap-3">
        <p className="flex items-center gap-2 text-sm">
          <Clock aria-hidden size={18} strokeWidth={1.75} className="text-info" />
          Bạn đã báo hoàn thành ngày {formatDate(reportedAt)}. RVPY sẽ xác nhận sau khi xem bài của bạn.
        </p>
        {note ? <p className="rounded-[10px] border border-border p-3 text-sm whitespace-pre-line">{note}</p> : null}
        {submissionUrl ? <a href={submissionUrl} target="_blank" rel="noopener noreferrer" className="text-sm break-all text-primary underline-offset-4 hover:underline">{submissionUrl}</a> : null}
        <div>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => send({ planLessonId, withdraw: true }, "Đã rút lại báo cáo")}>
            {pending ? "Đang lưu…" : "Rút lại báo cáo"}
          </Button>
        </div>
        {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      </div>
    );
  }

  const errors = form.formState.errors;
  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => send(values, "Đã gửi báo cáo hoàn thành"))}>
      <div className="grid gap-2">
        <Label htmlFor="report-note">Ghi chú cho RVPY (không bắt buộc)</Label>
        <Textarea id="report-note" rows={3} maxLength={500} placeholder="Bạn đã làm được gì, phần nào còn vướng…"
          aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "report-note-error" : undefined} {...form.register("note")} />
        {errors.note ? <p id="report-note-error" className="text-sm text-destructive">{errors.note.message}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="report-url">Liên kết bài làm (không bắt buộc)</Label>
        <Input id="report-url" type="url" inputMode="url" placeholder="https://" maxLength={500}
          aria-invalid={Boolean(errors.submissionUrl)} aria-describedby="report-url-help" {...form.register("submissionUrl")} />
        <p id="report-url-help" className="text-[13px] text-muted-foreground">Dán liên kết Google Drive hoặc ảnh chụp bài làm, nhớ mở quyền xem cho RVPY.</p>
        {errors.submissionUrl ? <p className="text-sm text-destructive">{errors.submissionUrl.message}</p> : null}
      </div>
      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>{pending ? "Đang gửi…" : "Báo đã hoàn thành bài này"}</Button>
      </div>
    </form>
  );
}
