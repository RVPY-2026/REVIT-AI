"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { recordStudentMessageSent } from "@/server/actions/student-notes"
import { Button } from "@/components/ui/button"
import { USE_MOCK } from "@/lib/runtime-mode"

export function RecordSentMessage({ studentId, title }: { studentId: string; title: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  return <Button type="button" variant="outline" size="compact" className="whitespace-normal" disabled={pending || USE_MOCK} onClick={async () => {
    setPending(true)
    try {
      const result = await recordStudentMessageSent({ studentId, title })
      if (!result.ok) { toast.error(result.error); return }
      toast.success("Đã ghi nhận tin gửi cho học viên"); router.refresh()
    } catch { toast.error("Chưa thể ghi nhận. Bạn thử lại nhé.") }
    finally { setPending(false) }
  }}>{pending ? "Đang lưu…" : "Đã gửi cho học viên"}</Button>
}
