import { AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { followUpState } from "@/lib/follow-up"
import type { StudentStatus } from "@/lib/constants"

/** Next-action hint derived from the latest call note; renders nothing once a lead is enrolled or dropped. */
export function FollowUpBadge({ student, className }: { student: { status: StudentStatus; lastContactAt: string | null }; className?: string }) {
  const state = followUpState(student)
  if (state.kind === "none") return null
  const tone = state.kind === "ok" ? "text-muted-foreground" : state.kind === "overdue" ? "text-warning" : "text-destructive"
  const Icon = state.kind === "ok" ? CheckCircle2 : state.kind === "overdue" ? Clock : AlertCircle
  return <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap ${tone} ${className ?? ""}`}>
    <Icon aria-hidden="true" size={14} strokeWidth={1.75} />{state.label}
  </span>
}
