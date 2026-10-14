"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { DroppedReasonDialog } from "@/components/admin/DroppedReasonDialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { STUDENT_STATUSES, STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants"
import { USE_MOCK } from "@/lib/runtime-mode"
import { updateStudentStatus } from "@/server/actions/student-status"
import type { DROPPED_REASONS } from "@/lib/crm"

export function StatusCell({ studentId, fullName, status, editable = false, preview = false, droppedReason, droppedNote }: {
  studentId: string; fullName: string; status: StudentStatus; editable?: boolean; preview?: boolean;
  droppedReason?: typeof DROPPED_REASONS[number] | null
  droppedNote?: string | null
}) {
  const router = useRouter()
  const [dropIntent, setDropIntent] = useState<{ expected: StudentStatus; undo: boolean } | null>(null)
  const [pending, setPending] = useState(false)
  const blocked = USE_MOCK || preview
  async function apply(next: StudentStatus, expected = status, reason?: typeof DROPPED_REASONS[number], note?: string, undo = false) {
    if (blocked) { toast.error("Chế độ xem thử chưa lưu thay đổi học viên."); return }
    setPending(true)
    try {
      const result = await updateStudentStatus({ studentId, status: next, expectedStatus: expected, reason, note })
      if (!result.ok) { toast.error(result.error); return }
      setDropIntent(null)
      router.refresh()
      if (undo) { toast.success("Đã hoàn tác trạng thái"); return }
      toast.success(next === "trial" || next === "enrolled" ? "Đã đổi phân loại. Vào hồ sơ để mở học thử / ghi danh." : `Đã chuyển ${fullName} sang “${STUDENT_STATUS_META[next].label}”`, {
        duration: 8000, action: { label: "Hoàn tác", onClick: () => {
          if (expected === "dropped" && (!droppedReason || (droppedReason === "other" && !droppedNote))) { setDropIntent({ expected: next, undo: true }); return }
          void apply(expected, next, expected === "dropped" ? droppedReason ?? undefined : undefined, expected === "dropped" ? droppedNote ?? undefined : undefined, true)
        } },
      })
    } catch { toast.error("Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé.") }
    finally { setPending(false) }
  }
  if (!editable) return <StatusBadge status={status} />
  return <><DropdownMenu><DropdownMenuTrigger asChild>
    <button type="button" disabled={pending} aria-label={`Đổi trạng thái của ${fullName}`} className="group inline-flex min-h-11 items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-ring">
      <StatusBadge status={status} /><ChevronDown aria-hidden="true" size={14} strokeWidth={1.75} className="text-muted-foreground" />
    </button></DropdownMenuTrigger><DropdownMenuContent align="start"><DropdownMenuRadioGroup value={status} onValueChange={value => {
      if (value === status || pending) return
      if (value === "dropped") setDropIntent({ expected: status, undo: false })
      else void apply(value as StudentStatus)
    }}>{STUDENT_STATUSES.map(value => <DropdownMenuRadioItem className="min-h-11" key={value} value={value}>{STUDENT_STATUS_META[value].label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
    <DroppedReasonDialog open={dropIntent !== null} onOpenChange={open => { if (!open) setDropIntent(null) }} pending={pending} preview={blocked} onConfirm={async data => { if (dropIntent) await apply("dropped", dropIntent.expected, data.reason, data.note, dropIntent.undo) }} />
  </>
}
