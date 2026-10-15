"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LearningPrimaryButton } from "./LearningPrimaryButton";
import { LearningSelect } from "./LearningSelect";
import type { ManagedLesson } from "@/lib/schemas/learning-content";
import { swapTrialLessons } from "@/server/actions/learning-content";

export function LearningTrialDialog({ lessons, preview, onClose }: { lessons: ManagedLesson[]; preview: boolean; onClose: () => void }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [error, setError] = useState("");
  const current = lessons.filter((l) => l.trialOrder !== null).sort((a, b) => a.trialOrder! - b.trialOrder!).map((l) => l.id);
  const [selected, setSelected] = useState(current);
  const options = lessons.filter((l) => l.phase === "foundation" && l.active).map((l) => ({ value: l.id, label: `${l.lessonNumbers.join("/")} · ${l.title}` }));
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent className="[&>button]:size-11 max-sm:content-start max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none"><DialogHeader><DialogTitle>Đổi ba bài học thử</DialogTitle><DialogDescription>Bạn chọn ba bài khác nhau trong Nền tảng. Thay đổi chỉ áp dụng cho học viên mở học sau này.</DialogDescription></DialogHeader><form className="grid content-start gap-4" onSubmit={(event) => { event.preventDefault(); if (selected.length !== 3 || new Set(selected).size !== 3) { setError("Bạn chọn ba bài khác nhau."); document.getElementById("trial-1")?.focus(); return; } start(async () => { const result = await swapTrialLessons({ lessonIds: selected, expectedIds: current }); if (!result.ok) { setError(result.error); return; } toast.success("Đã đổi ba bài học thử"); router.refresh(); onClose(); }); }}>
    {[0, 1, 2].map((i) => <LearningSelect key={i} id={`trial-${i + 1}`} label={`Học thử ${i + 1}`} value={selected[i] ?? ""} options={options} onChange={(value) => setSelected((rows) => { const next = [...rows]; next[i] = value; return next; })} />)}
    <p className="text-sm text-destructive" role="status" aria-live="polite">{error}</p>{preview && <p className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}<DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Đóng hộp thoại</Button><LearningPrimaryButton disabled={preview || pending} type="submit">{pending ? "Đang đổi bài…" : "Đổi bài học thử"}</LearningPrimaryButton></DialogFooter></form></DialogContent></Dialog>;
}
