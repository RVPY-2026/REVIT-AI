"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { STUDENT_STATUSES, STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants"
import { USE_MOCK } from "@/lib/runtime-mode"
import { updateStudentStatus } from "@/server/actions/student-status"

/**
 * Status shown as a badge. Changing it takes two steps (pick, then confirm) and the toast
 * offers an undo, so a stray tap in a dense table cannot silently reclassify a lead.
 */
export function StatusCell({ studentId, fullName, status, editable = false, preview = false }: {
  studentId: string
  fullName: string
  status: StudentStatus
  editable?: boolean
  preview?: boolean
}) {
  const router = useRouter()
  const [target, setTarget] = useState<StudentStatus | null>(null)
  const [pending, setPending] = useState(false)
  const blocked = USE_MOCK || preview

  if (!editable) return <StatusBadge status={status} />

  async function apply(next: StudentStatus, expected: StudentStatus, isUndo = false) {
    const result = await updateStudentStatus({ studentId, status: next, expectedStatus: expected })
    if (!result.ok) { toast.error(result.error); return false }
    router.refresh()
    if (isUndo) { toast.success("Đã hoàn tác trạng thái"); return true }
    toast.success(`Đã chuyển ${fullName} sang “${STUDENT_STATUS_META[next].label}”`, {
      duration: 8000,
      action: { label: "Hoàn tác", onClick: () => { void apply(expected, next, true) } },
    })
    return true
  }

  async function confirm() {
    if (!target || pending || blocked) return
    setPending(true)
    try { if (await apply(target, status)) setTarget(null) }
    catch { toast.error("Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé.") }
    finally { setPending(false) }
  }

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Đổi trạng thái của ${fullName}`} className="group inline-flex items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-ring">
          <StatusBadge status={status} />
          <ChevronDown aria-hidden="true" size={14} strokeWidth={1.75} className="text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={status} onValueChange={(value) => { if (value !== status) setTarget(value as StudentStatus) }}>
          {STUDENT_STATUSES.map((value) => <DropdownMenuRadioItem key={value} value={value}>{STUDENT_STATUS_META[value].label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    <AlertDialog open={target !== null} onOpenChange={(open) => { if (!open && !pending) setTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Đổi trạng thái học viên?</AlertDialogTitle>
          <AlertDialogDescription>
            {fullName}: “{STUDENT_STATUS_META[status].label}” → “{target ? STUDENT_STATUS_META[target].label : ""}”. Thay đổi được ghi vào lịch sử hồ sơ và chỉ sửa phân loại, không kích hoạt quyền học hay thay đổi học phí.
            {blocked && " Chế độ xem thử chưa lưu thay đổi."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Giữ nguyên</AlertDialogCancel>
          <AlertDialogAction disabled={pending || blocked} onClick={(event) => { event.preventDefault(); void confirm() }}>{pending ? "Đang lưu…" : "Xác nhận đổi"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
}
