"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { editCallNote } from "@/server/actions/student-notes"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { USE_MOCK } from "@/lib/runtime-mode"

export function NoteBodyEditor({ studentId, noteId, body }: { studentId: string; noteId: string; body: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(body)
  const [pending, setPending] = useState(false)
  if (!open) return <Button variant="ghost" size="compact" onClick={() => setOpen(true)}>Sửa nội dung</Button>
  return <form className="mt-3 grid gap-2" onSubmit={async event => {
    event.preventDefault(); if (USE_MOCK) return; setPending(true)
    try {
      const result = await editCallNote({ studentId, noteId, body: draft, expectedBody: body })
      if (!result.ok) { toast.error(result.error); return }
      setOpen(false); router.refresh(); toast.success("Đã sửa ghi chú")
    } catch { toast.error("Chưa thể sửa ghi chú. Bạn thử lại nhé.") }
    finally { setPending(false) }
  }}><Textarea aria-label="Sửa nội dung ghi chú" value={draft} maxLength={4000} onChange={event => setDraft(event.target.value)} disabled={pending} />
    {USE_MOCK && <p role="status" className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu ghi chú.</p>}
    <div className="flex gap-2"><Button type="submit" size="compact" disabled={pending || USE_MOCK || !draft.trim()}>Lưu nội dung</Button><Button type="button" variant="outline" size="compact" disabled={pending} onClick={() => setOpen(false)}>Hủy</Button></div>
  </form>
}
