"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ARCHIVE_REASONS, ARCHIVE_REASON_LABELS } from "@/lib/crm"
import { archiveStudent, restoreStudent, transferStudentSource } from "@/server/actions/student-management"
import { USE_MOCK } from "@/lib/runtime-mode"
import { CrmSelect } from "@/components/admin/CrmSelect"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export function StudentManagementActions({ student, sources }: {
  student: { id: string; sourceId: string; archivedAt?: string | null }; sources: { id: string; code: string; name: string; active?: boolean }[]
}) {
  const router = useRouter()
  const id = useId()
  const [mode, setMode] = useState<"archive" | "transfer" | "restore" | null>(null)
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)
  const options = mode === "archive" ? ARCHIVE_REASONS.map(value => ({ value, label: ARCHIVE_REASON_LABELS[value] })) : sources.filter(source => source.active !== false && source.id !== student.sourceId).map(source => ({ value: source.id, label: `${source.code} · ${source.name}` }))
  const valid = mode === "restore" || Boolean(reason && (mode === "transfer" || reason === "other" ? note.trim() : true))
  return <><div className="flex flex-wrap gap-2">{student.archivedAt ? <Button variant="outline" size="compact" onClick={() => setMode("restore")}>Khôi phục hồ sơ</Button> : <>
    <Button variant="outline" size="compact" onClick={() => { setMode("transfer"); setReason(""); setNote("") }}>Chuyển nguồn</Button><Button variant="outline" size="compact" onClick={() => { setMode("archive"); setReason(""); setNote("") }}>Lưu trữ hồ sơ</Button></>}</div>
    <Dialog open={mode !== null} onOpenChange={open => { if (!open && !pending) setMode(null) }}><DialogContent className="[&_input]:min-h-11">
      <DialogHeader><DialogTitle>{mode === "archive" ? "Lưu trữ hồ sơ" : mode === "transfer" ? "Chuyển nguồn" : "Khôi phục hồ sơ"}</DialogTitle><DialogDescription>{mode === "transfer" ? "Mã học viên được giữ nguyên. Nhân viên nguồn mới sẽ có quyền quản lý hồ sơ." : mode === "archive" ? "Hồ sơ được giữ lại và tạm ẩn khỏi danh sách đang xử lý." : "Hồ sơ sẽ trở lại danh sách và có thể chỉnh sửa."}</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={async event => {
        event.preventDefault(); if (!valid || !mode) return; setPending(true)
        try {
          const result = mode === "restore" ? await restoreStudent({ studentId: student.id, expectedArchivedAt: student.archivedAt }) : mode === "archive"
            ? await archiveStudent({ studentId: student.id, expectedArchivedAt: null, reason, note: note.trim() || undefined })
            : await transferStudentSource({ studentId: student.id, expectedSourceId: student.sourceId, sourceId: reason, reason: note })
          if (!result.ok) { toast.error(result.error); return }
          setMode(null); toast.success("Đã cập nhật hồ sơ"); router.refresh()
        } catch { toast.error("Chưa thể cập nhật. Bạn thử lại nhé.") } finally { setPending(false) }
      }}>
        {mode !== "restore" && <><CrmSelect label={mode === "archive" ? "Lý do lưu trữ" : "Nguồn đích"} value={reason} options={options} onChange={setReason} disabled={pending} /><Label htmlFor={`${id}-note`}>{mode === "transfer" ? "Lý do chuyển nguồn" : "Ghi chú"}</Label><Textarea id={`${id}-note`} value={note} maxLength={4000} required={mode === "transfer" || reason === "other"} onChange={event => setNote(event.target.value)} /></>}
        {USE_MOCK && <p role="status" className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setMode(null)}>Hủy</Button><Button type="submit" disabled={pending || USE_MOCK || !valid}>{pending ? "Đang lưu…" : "Xác nhận"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </>
}
