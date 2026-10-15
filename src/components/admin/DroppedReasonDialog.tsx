"use client"

import { useState } from "react"
import { DROPPED_REASONS, DROPPED_REASON_LABELS } from "@/lib/crm"
import { CrmSelect } from "@/components/admin/CrmSelect"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export function DroppedReasonDialog({ open, onOpenChange, onConfirm, pending = false, preview = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; pending?: boolean; preview?: boolean;
  onConfirm: (data: { reason: typeof DROPPED_REASONS[number]; note?: string }) => Promise<void>
}) {
  const [reason, setReason] = useState<typeof DROPPED_REASONS[number] | "">("")
  const [note, setNote] = useState("")
  return <Dialog open={open} onOpenChange={next => { if (!pending) onOpenChange(next) }}><DialogContent className="[&_input]:min-h-11">
    <DialogHeader><DialogTitle>Lý do không tiếp tục</DialogTitle><DialogDescription>Chọn lý do để đội ngũ hiểu kết quả tư vấn. Hồ sơ và quyền học được giữ nguyên.</DialogDescription></DialogHeader>
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); if (reason && (reason !== "other" || note.trim())) void onConfirm({ reason, note: note.trim() || undefined }) }}>
      <CrmSelect label="Lý do không tiếp tục" value={reason} options={DROPPED_REASONS.map(value => ({ value, label: DROPPED_REASON_LABELS[value] }))} onChange={value => setReason(value as typeof DROPPED_REASONS[number])} disabled={pending} />
      <Label htmlFor="dropped-note">Ghi chú {reason === "other" ? "(bắt buộc)" : "(không bắt buộc)"}</Label>
      <Textarea id="dropped-note" value={note} maxLength={4000} required={reason === "other"} onChange={event => setNote(event.target.value)} disabled={pending} />
      {preview && <p role="status" className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Hủy</Button><Button type="submit" disabled={pending || preview || !reason || (reason === "other" && !note.trim())}>{pending ? "Đang lưu…" : "Lưu lý do"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>
}
