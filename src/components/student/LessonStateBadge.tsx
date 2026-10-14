import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LessonState } from "@/lib/student-learning";

const STATE_META: Record<LessonState, { label: string; variant: "success" | "info" | "destructive" | "muted" }> = {
  completed: { label: "Đã hoàn thành", variant: "success" },
  reported: { label: "Chờ xác nhận", variant: "info" },
  overdue: { label: "Quá hạn", variant: "destructive" },
  upcoming: { label: "Chưa học", variant: "muted" },
};

/** Lesson status pill; a locked lesson shows the lock instead of a state it cannot have yet. */
export function LessonStateBadge({ state, locked = false }: { state: LessonState; locked?: boolean }) {
  if (locked) return <Badge variant="outline"><Lock aria-hidden strokeWidth={1.75} />Mở khi học chính thức</Badge>;
  const { label, variant } = STATE_META[state];
  return <Badge variant={variant}>{label}</Badge>;
}
