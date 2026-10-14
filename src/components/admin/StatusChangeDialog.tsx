"use client"

import { useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateStudentStatusSchema } from "@/lib/schemas/student-status"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants"
import { USE_MOCK } from "@/lib/runtime-mode"
import { updateStudentStatus } from "@/server/actions/student-status"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function StatusChangeDialog({ studentId, fullName, status, compact = false, preview = false, trigger = true, open: controlledOpen, onOpenChange }: {
  studentId: string
  fullName: string
  status: StudentStatus
  compact?: boolean
  preview?: boolean
  trigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const form = useForm<{ status: StudentStatus }>({ resolver: zodResolver(updateStudentStatusSchema.omit({ studentId: true })), defaultValues: { status } })
  const draft = useWatch({ control: form.control, name: "status" })
  const [pending, setPending] = useState(false)
  const selectId = useId()
  const dialogOpen = controlledOpen ?? open
  // Controlled menus mount this dialog on opening, so the initial draft is current.
  function changeOpen(next: boolean) {
    if (pending) return
    if (next) form.reset({ status })
    setOpen(next)
    onOpenChange?.(next)
  }
  async function saveStatus({ status: nextStatus }: { status: StudentStatus }) {
    if (pending || USE_MOCK || preview || nextStatus === status) return
    setPending(true)
    try {
      const result = await updateStudentStatus({ studentId, status: nextStatus })
      if (!result.ok) { toast.error(result.error); return }
      toast.success("Đã cập nhật trạng thái học viên")
      setOpen(false)
      onOpenChange?.(false)
      router.refresh()
    } catch {
      toast.error("Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé.")
    } finally { setPending(false) }
  }
  return <Dialog open={dialogOpen} onOpenChange={changeOpen}>
    {trigger && <DialogTrigger asChild><Button type="button" variant="outline" size="sm" className={compact ? "px-2" : undefined}>Sửa trạng thái</Button></DialogTrigger>}
    <DialogContent>
      <DialogHeader><DialogTitle>Sửa trạng thái</DialogTitle><DialogDescription>Chọn trạng thái cho {fullName}. Thay đổi được lưu vào lịch sử hồ sơ.</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={form.handleSubmit(saveStatus)}>
        <div className="grid gap-2"><Label htmlFor={selectId}>Trạng thái</Label><DropdownMenu><DropdownMenuTrigger asChild><Button id={selectId} type="button" variant="outline" className="w-full justify-between" disabled={pending}>{STUDENT_STATUS_META[draft].label}<ChevronDown aria-hidden="true" strokeWidth={1.75} /></Button></DropdownMenuTrigger><DropdownMenuContent className="w-64"><DropdownMenuRadioGroup value={draft} onValueChange={(value) => { if (Object.hasOwn(STUDENT_STATUS_META, value)) form.setValue("status", value as StudentStatus, { shouldValidate: true }) }}>{(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map((value) => <DropdownMenuRadioItem key={value} value={value}>{STUDENT_STATUS_META[value].label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div>
        <p className="text-sm text-muted-foreground">Thao tác này chỉ sửa trạng thái hồ sơ; không kích hoạt quyền học hoặc thay đổi học phí.</p>
        {(USE_MOCK || preview) && <p role="status" className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => changeOpen(false)}>Hủy</Button><Button type="submit" disabled={pending || USE_MOCK || preview || draft === status}>{pending ? "Đang lưu…" : "Lưu trạng thái"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
