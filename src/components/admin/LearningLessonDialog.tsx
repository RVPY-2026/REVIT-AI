"use client";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LearningSelect } from "./LearningSelect";
import { lessonSchema, type ManagedLesson } from "@/lib/schemas/learning-content";
import { PHASE_LABELS } from "@/lib/learning-content";
import { saveLesson } from "@/server/actions/learning-content";

export function LearningLessonDialog({ lesson, preview, onClose }: { lesson: ManagedLesson | null; preview: boolean; onClose: () => void }) {
  const router = useRouter(); const [pending, start] = useTransition();
  const form = useForm<z.infer<typeof lessonSchema>>({ resolver: zodResolver(lessonSchema), mode: "onBlur", reValidateMode: "onBlur", defaultValues: lesson ? { id: lesson.id, title: lesson.title, phase: lesson.phase, baseDays: lesson.baseDays, lessonNumbers: lesson.lessonNumbers, active: lesson.active } : { title: "", phase: "foundation", baseDays: null, lessonNumbers: [1], active: true } });
  const errors = form.formState.errors;
  const phase = useWatch({ control: form.control, name: "phase" });
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent className="[&>button]:size-11 max-sm:content-start max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none"><DialogHeader><DialogTitle>{lesson ? "Sửa bài học" : "Thêm bài học"}</DialogTitle><DialogDescription>Thay đổi chỉ áp dụng cho học viên mở học sau này. {lesson ? `${lesson.planCount} kế hoạch đang dùng bài này.` : "Học viên hiện tại giữ nguyên kế hoạch."}</DialogDescription></DialogHeader><form className="grid content-start gap-4" onSubmit={form.handleSubmit((data) => start(async () => { const result = await saveLesson(data); if (!result.ok) { form.setError("root", { message: result.error }); return; } toast.success(`Đã lưu bài ${data.title}`); router.refresh(); onClose(); }))} noValidate>
  <div className="grid gap-2"><Label htmlFor="lesson-title">Tên bài học</Label><Input id="lesson-title" {...form.register("title")} aria-invalid={!!errors.title} aria-describedby="lesson-title-error" /><p id="lesson-title-error" className="text-sm text-destructive">{errors.title?.message}</p></div>
  <LearningSelect id="lesson-phase" label="Giai đoạn" value={phase} options={Object.entries(PHASE_LABELS).map(([value, label]) => ({ value, label }))} disabled={!!lesson} onChange={(value) => form.setValue("phase", value as "foundation" | "specialist")} />
  <div className="grid gap-2"><Label htmlFor="lesson-numbers">Số bài học</Label><Controller name="lessonNumbers" control={form.control} render={({ field }) => <Input id="lesson-numbers" inputMode="text" name={field.name} ref={field.ref} onBlur={field.onBlur} value={field.value.map((n) => Number.isNaN(n) ? "" : n).join("/")} onChange={(event) => field.onChange(event.target.value.split("/").map((value) => value === "" ? NaN : Number(value)))} aria-invalid={!!errors.lessonNumbers} />} /><p className="text-xs text-muted-foreground">Bài gộp: nhập 4/5.</p><p className="text-sm text-destructive">{errors.lessonNumbers?.message ?? errors.lessonNumbers?.[0]?.message}</p></div>
  <div className="grid gap-2"><Label htmlFor="lesson-days">Số ngày dự kiến</Label><Input id="lesson-days" type="number" min={0} max={3650} inputMode="numeric" {...form.register("baseDays", { setValueAs: (value: string) => value === "" ? null : Number(value) })} /><p className="text-sm text-destructive">{errors.baseDays?.message}</p></div>
  {preview && <p className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}<p role="status" aria-live="polite" className="text-sm text-destructive">{errors.root?.message}</p><DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Đóng hộp thoại</Button><Button type="submit" disabled={pending || preview}>{pending ? "Đang lưu bài…" : "Lưu bài học"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
