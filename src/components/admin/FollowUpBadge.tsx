import { AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { followUpState } from "@/lib/follow-up"
import type { StudentStatus } from "@/lib/constants"

/** Next-action hint derived from the latest call note; renders nothing once a lead is enrolled or dropped. */
export function FollowUpBadge({ student, className }: { student: { status: StudentStatus; lastContactAt: string | null; nextActionAt?: string | null; archivedAt?: string | null }; className?: string }) {
  const state = followUpState(student)
  if (state.kind === "none") return null
  const tone = state.kind === "ok" || state.kind === "scheduled" ? "text-muted-foreground" : state.kind === "overdue" || state.kind === "due" ? "text-warning" : "text-destructive"
  const Icon = state.kind === "ok" ? CheckCircle2 : state.kind === "overdue" || state.kind === "due" || state.kind === "scheduled" ? Clock : AlertCircle
  return <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${tone} ${className ?? ""}`}>
    <Icon aria-hidden="true" size={14} strokeWidth={1.75} />{state.label}
  </span>
}
