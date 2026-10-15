"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteStudentPermanently } from "@/server/actions/student-delete"
import { USE_MOCK } from "@/lib/runtime-mode"
import type { StudentDeletionCheck } from "@/lib/student-deletion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

/** Rendered by the server only for admins viewing an archived profile. */
export function StudentPermanentDelete({ student, check, preview = false }: {
  student: { id: string; code: string; archivedAt: string }; check: StudentDeletionCheck; preview?: boolean
}) {
  const router = useRouter()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState("")
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const blocked = check.blockers.length > 0
  const valid = confirmationCode === student.code && reason.trim().length > 0
  const mock = USE_MOCK || preview
  return <section aria-label="Xóa vĩnh viễn hồ sơ" className="mt-4 grid gap-3 rounded-xl border border-destructive/40 p-4">
    <h2 className="text-base font-medium">Xóa vĩnh viễn hồ sơ</h2>
    <p className="text-sm text-muted-foreground">Chỉ dành cho hồ sơ đã lưu trữ ít nhất 30 ngày và chưa phát sinh dữ liệu cần giữ lại.</p>
    {blocked && <div role="status" className="grid gap-2 text-sm"><p>Chưa thể xóa hồ sơ này:</p><ul className="list-disc space-y-1 pl-5">{check.blockers.map(message => <li key={message}>{message}</li>)}</ul></div>}
    <Dialog open={open} onOpenChange={next => { if (!pending) { setOpen(next); if (next) { setConfirmationCode(""); setReason(""); setError(null) } } }}>
      <DialogTrigger asChild><Button variant="destructive" size="compact" className="w-fit" disabled={blocked}>Xóa vĩnh viễn</Button></DialogTrigger>
      <DialogContent onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onPointerDownOutside={event => { if (pending) event.preventDefault() }} showCloseButton={!pending}>
        <DialogHeader><DialogTitle>Xóa vĩnh viễn {student.code}</DialogTitle><DialogDescription>Hành động này xóa toàn bộ hồ sơ học viên, thông tin đăng ký, ghi chú liên hệ, lịch sử trạng thái và phiên đăng ký. Không thể khôi phục. Mã học viên đã xóa, nguồn, kỳ mã, số thứ tự, thời điểm, người xóa và lý do được giữ vĩnh viễn; mã này không được cấp lại. Nhật ký xóa chỉ giữ mã, mã nguồn, trạng thái, lý do lưu trữ và ngày đăng ký.</DialogDescription></DialogHeader>
        <form className="grid min-w-0 gap-4" onSubmit={async event => {
          event.preventDefault(); if (!valid || pending || blocked || mock) return
          setPending(true); setError(null)
          try {
            const result = await deleteStudentPermanently({ studentId: student.id, expectedArchivedAt: student.archivedAt, confirmationCode, reason })
            if (!result.ok) { setError(result.error); router.refresh(); return }
            toast.success(`Đã xóa vĩnh viễn hồ sơ ${result.data.code}`)
            setOpen(false); router.replace("/quan-tri/hoc-vien?archived=true"); router.refresh()
          } catch { setError("Chưa thể xóa hồ sơ. Bạn thử lại sau nhé.") }
          finally { setPending(false) }
        }}>
          <div className="grid gap-2"><Label htmlFor={`${id}-code`}>Nhập chính xác mã {student.code}</Label><Input id={`${id}-code`} autoComplete="off" value={confirmationCode} onChange={event => setConfirmationCode(event.target.value)} disabled={pending} required aria-describedby={`${id}-code-help`} /><p id={`${id}-code-help`} className="text-sm text-muted-foreground">Phân biệt chữ hoa, chữ thường và khoảng trắng.</p></div>
          <div className="grid gap-2"><Label htmlFor={`${id}-reason`}>Lý do xóa vĩnh viễn</Label><Textarea id={`${id}-reason`} value={reason} onChange={event => setReason(event.target.value)} disabled={pending} required maxLength={4000} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {blocked && <p role="alert" className="text-sm text-destructive">Điều kiện xóa vừa thay đổi. Bạn đóng hộp thoại và kiểm tra lại danh sách điều kiện.</p>}
          {mock && <p role="status" className="text-sm text-muted-foreground">Chế độ xem thử không xóa hồ sơ.</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Giữ hồ sơ</Button><Button type="submit" variant="destructive" disabled={!valid || blocked || pending || mock}>{pending ? "Đang xóa…" : "Xóa vĩnh viễn"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>
}
