import type { StudentSummary } from "@/lib/schemas/student"

export function TrialSummary({ student }: { student: StudentSummary }) {
  if (student.status !== "trial" && student.status !== "enrolled") return null
  if (!student.trial?.hasPlan) return <span className="inline-flex rounded-full border border-warning px-2 py-1 text-xs text-warning">Chưa mở học thử</span>
  return <span className="whitespace-normal text-xs text-muted-foreground">{student.trial.daysLeft === null ? "Chưa có ngày học thử" : `Còn ${student.trial.daysLeft} ngày`} · Chuẩn bị {student.trial.checklist}/3 · Đã học {student.trial.confirmed}/3</span>
}
