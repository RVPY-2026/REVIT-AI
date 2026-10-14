"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { StatusBadge } from "./StatusBadge";
import { ClipboardButton } from "./ClipboardButton";
import { DataTable, type DataTableColumn } from "./DataTable";
import { LearningSelect } from "./LearningSelect";
import type { LearningProgress } from "@/lib/schemas/learning-content";
import { PHASE_LABELS } from "@/lib/learning-content";
import { formatDate } from "@/lib/format";
import { bulkConfirmLearning, confirmLearningLesson } from "@/server/actions/learning-content";

type Lesson = LearningProgress["lessons"][number];
export function StudentLearningProgressPanel({ data, editable, preview }: { data: LearningProgress; editable: boolean; preview: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [bulkOpen, setBulkOpen] = useState(false); const [error, setError] = useState(""); const [page, setPage] = useState(0); const [phase, setPhase] = useState("any");
  const eligible = (l: Lesson) => data.active && (l.trialOrder !== null || data.kind === "formal");
  const reported = data.lessons.filter((l) => eligible(l) && l.reportedAt && !l.completedAt).slice(0, 30);
  const filtered = data.lessons.filter((l) => phase === "any" || l.phase === phase); const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 20) - 1)); const visible = filtered.slice(currentPage * 20, (currentPage + 1) * 20);
  const snapshot = (l: Lesson, completed: boolean) => ({ studentId: data.studentId, planLessonId: l.id, completed, expectedCompletedAt: l.completedAt, expectedReportedAt: l.reportedAt });
  async function confirm(l: Lesson, completed: boolean) {
    const result = await confirmLearningLesson(snapshot(l, completed));
    if (!result.ok) { setError(result.error); toast.error(result.error); return; }
    setError(""); router.refresh();
    toast.success(`${completed ? "Đã xác nhận" : "Đã bỏ xác nhận"} ${l.title}`, { duration: 8000, action: { label: "Hoàn tác", onClick: () => start(async () => {
      const undo = await confirmLearningLesson({ ...snapshot(l, !completed), expectedCompletedAt: result.data.completedAt, expectedReportedAt: result.data.reportedAt });
      if (!undo.ok) toast.error(undo.error); else { toast.success(`Đã xác nhận lại ${l.title}`); router.refresh(); }
    }) } });
  }
  function report(l: Lesson) { return <div className="grid min-w-0 gap-2"><StatusBadge status={l.reportedAt ? "reported" : "upcoming"} />{l.progressNote && <p className="max-w-64 whitespace-pre-wrap break-words text-sm text-muted-foreground">{l.progressNote}</p>}{l.submissionUrl && <div className="flex flex-wrap items-center gap-1"><a className="inline-flex min-h-11 items-center text-sm text-primary underline" href={l.submissionUrl} target="_blank" rel="noreferrer">Xem bài nộp</a><ClipboardButton text={l.submissionUrl} label="Sao chép bài nộp" /></div>}</div>; }
  function action(l: Lesson) { return editable ? <Button variant="outline" className="min-h-11 whitespace-normal" disabled={preview || pending || !eligible(l)} onClick={() => start(() => confirm(l, !l.completedAt))}>{l.completedAt ? "Bỏ xác nhận" : "Xác nhận hoàn thành"}</Button> : <span className="text-sm text-muted-foreground">Bạn chưa có quyền xác nhận.</span>; }
  const columns: DataTableColumn<Lesson>[] = [
    { id: "title", header: "Bài học", cell: ({ row }) => <p className="max-w-48 break-words" title={row.original.title}>{row.original.title}</p> },
    { id: "report", header: "Học viên báo", cell: ({ row }) => report(row.original) },
    { id: "confirmation", header: "Xác nhận", cell: ({ row }) => <StatusBadge status={row.original.completedAt ? "confirmed" : "unconfirmed"} /> },
    { id: "due", header: "Hạn học", cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs tabular-nums">{row.original.dueDate ? formatDate(row.original.dueDate) : "Chưa có hạn"}</span> },
    { id: "action", header: "Thao tác", cell: ({ row }) => action(row.original) },
  ];
  return <Card><CardHeader><CardTitle><h2 className="text-lg font-medium">Tiến độ học tập</h2></CardTitle><p className="text-sm text-muted-foreground">Xem bài học viên đã báo và xác nhận hoàn thành từng bài.</p></CardHeader><CardContent className="grid min-w-0 gap-4">
    {preview && <p className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}{!data.active && <p className="text-sm text-muted-foreground">Bạn mở lượt học đang hoạt động để xác nhận bài.</p>}{data.kind === "trial" && <p className="text-sm text-muted-foreground">Bài ngoài học thử cần mở học chính thức trước khi xác nhận.</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><LearningSelect id="progress-phase" label="Giai đoạn" value={phase} options={[{ value: "any", label: "Mọi giai đoạn" }, ...Object.entries(PHASE_LABELS).map(([value, label]) => ({ value, label }))]} onChange={(v) => { setPhase(v); setPage(0); }} />{editable && <Button className="min-h-11 whitespace-normal" disabled={pending || !reported.length} onClick={() => setBulkOpen(true)}>Xác nhận các bài đã báo ({reported.length})</Button>}</div>
    <p role="status" aria-live="polite" className="text-sm text-destructive">{pending ? "Đang lưu tiến độ…" : error}{error && <Button variant="outline" onClick={() => { setError(""); router.refresh(); }}>Thử tải lại</Button>}</p>
    {visible.length ? (["foundation", "specialist"] as const).filter((key) => visible.some((l) => l.phase === key)).map((key) => <section key={key} className="min-w-0 space-y-3"><h3 className="text-lg font-medium">{PHASE_LABELS[key]}</h3><DataTable cardsOnly listLabel="Tiến độ bài học" columns={columns} data={visible.filter((l) => l.phase === key)} rowKey={(l) => l.id} mobileCards={(l) => <article className="min-w-0 space-y-3 rounded-xl border p-3"><h4 className="break-words text-sm font-medium">{l.title}</h4>{report(l)}<div className="flex flex-wrap items-center gap-2"><StatusBadge status={l.completedAt ? "confirmed" : "unconfirmed"} /><span className="text-xs text-muted-foreground">Hạn học: {l.dueDate ? formatDate(l.dueDate) : "Chưa có hạn"}</span></div>{action(l)}</article>} /></section>) : <div className="rounded-xl border border-dashed p-6 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground" aria-hidden="true" strokeWidth={1.75} /><p className="mt-3 text-sm text-muted-foreground">Bạn mở học thử ở phần trên để tạo kế hoạch học.</p></div>}
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Đang hiển thị {filtered.length ? currentPage * 20 + 1 : 0}–{Math.min((currentPage + 1) * 20, filtered.length)} trong tổng số {filtered.length}</p><div className="flex gap-2"><Button variant="outline" className="min-h-11" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Trang trước</Button><Button variant="outline" className="min-h-11" disabled={(currentPage + 1) * 20 >= filtered.length} onClick={() => setPage(currentPage + 1)}>Trang sau</Button></div></div>
    <AlertDialog open={bulkOpen} onOpenChange={(open) => { if (!pending) setBulkOpen(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận {reported.length} bài đã báo?</AlertDialogTitle><AlertDialogDescription>Các bài dưới đây sẽ được xác nhận hoàn thành. Mỗi lần tối đa 30 bài. Bạn có thể bỏ xác nhận từng bài sau đó.</AlertDialogDescription></AlertDialogHeader><ul className="max-h-48 overflow-auto text-sm">{reported.map((l) => <li key={l.id} className="break-words py-1">{l.title}</li>)}</ul><AlertDialogFooter><AlertDialogCancel disabled={pending}>Giữ tiến độ</AlertDialogCancel><Button disabled={pending || preview} onClick={() => start(async () => { const result = await bulkConfirmLearning({ studentId: data.studentId, lessons: reported.map((l) => ({ planLessonId: l.id, expectedCompletedAt: l.completedAt, expectedReportedAt: l.reportedAt })) }); if (!result.ok) { setError(result.error); toast.error(result.error); return; } toast.success(`Đã xác nhận ${reported.length} bài học`); setBulkOpen(false); router.refresh(); })}>{pending ? "Đang xác nhận…" : "Xác nhận các bài"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </CardContent></Card>;
}
