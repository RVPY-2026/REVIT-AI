"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GripVertical } from "lucide-react"
import { toast } from "sonner"
import { updateStudentStatus } from "@/server/actions/student-status"
import { DroppedReasonDialog } from "@/components/admin/DroppedReasonDialog"
import { TrialSummary } from "@/components/admin/TrialSummary"
import { USE_MOCK } from "@/lib/runtime-mode"
import type { DROPPED_REASONS } from "@/lib/crm"
import { Card, CardContent } from "@/components/ui/card"
import { STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import type { StudentSummary } from "@/lib/schemas/student"
import { ClipboardButton } from "@/components/admin/ClipboardButton"
import { FollowUpBadge } from "@/components/admin/FollowUpBadge"
import { StatusCell } from "@/components/admin/StatusCell"

export type KanbanColumnData = {
  status: StudentStatus
  count: number
  rows: StudentSummary[]
}

type MoveIntent = { student: StudentSummary; status: StudentStatus }


export function KanbanBoard({ columns, editable }: { columns: KanbanColumnData[]; editable: boolean }) {
  const router = useRouter()
  const [intent, setIntent] = useState<MoveIntent | null>(null)
  const [pending, setPending] = useState(false)
  const [dragged, setDragged] = useState<StudentSummary | null>(null)
  const limitedColumns = columns.some((column) => column.count > column.rows.length)

  async function move(intent: MoveIntent, reason?: typeof DROPPED_REASONS[number], note?: string, undo = false) {
    if (pending) return
    setPending(true)
    try {
      const result = await updateStudentStatus({ studentId: intent.student.id, status: intent.status, expectedStatus: intent.student.status, reason, note })
      if (!result.ok) { toast.error(result.error); return }
      setIntent(null)
      router.refresh()
      toast.success(undo ? "Đã hoàn tác" : intent.status === "trial" || intent.status === "enrolled" ? "Đã đổi phân loại. Vào hồ sơ để mở học thử / ghi danh." : "Đã chuyển trạng thái học viên", {
        duration: 8000, ...(!undo ? { action: { label: "Hoàn tác", onClick: () => {
          const reverse = { student: { ...intent.student, status: intent.status }, status: intent.student.status }
          if (reverse.status === "dropped" && !intent.student.droppedReason) setIntent(reverse)
          else void move(reverse, intent.student.droppedReason ?? undefined, intent.student.droppedNote ?? undefined, true)
        } } } : {}),
      })
    } catch { toast.error("Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé.") }
    finally { setPending(false); setDragged(null) }
  }

  return (
    <>
      {limitedColumns && <p className="mb-3 rounded-lg border border-border bg-background-2 px-3 py-2 text-xs text-muted-foreground">Một số cột có hơn 100 hồ sơ. Số trên đầu cột là tổng phù hợp với bộ lọc; danh sách đang hiển thị 100 hồ sơ đầu tiên.</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {columns.map((column) => (
          <section
            key={column.status}
            className={`min-w-0 rounded-2xl border border-border bg-background-2/60 p-3 transition-colors ${dragged && !dragged.archivedAt ? "border-primary bg-primary-soft/40" : ""}`}
            aria-label={`${STUDENT_STATUS_META[column.status].label}: ${column.count} học viên`}
            onDragOver={(event) => {
              if (dragged && !dragged.archivedAt) event.preventDefault()
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (dragged && !dragged.archivedAt && dragged.status !== column.status) {
                const next = { student: dragged, status: column.status }
                if (column.status === "dropped") setIntent(next)
                else void move(next)
              }
              setDragged(null)
            }}
          >
            <header className="flex min-h-12 items-center justify-between gap-2 border-b border-border pb-3">
              <h2 className="text-sm font-medium text-foreground">{STUDENT_STATUS_META[column.status].label}</h2>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">{column.count}</span>
            </header>
            <ul className="mt-3 grid content-start gap-2">
              {column.rows.map((student) => (
                <li key={student.id}>
                  <Card
                    size="sm"
                    draggable={editable && !student.archivedAt}
                    onDragStart={(event) => { if (!window.matchMedia("(pointer: fine)").matches || student.archivedAt) event.preventDefault(); else setDragged(student) }}
                    onDragEnd={() => setDragged(null)}
                    className={dragged?.id === student.id ? "opacity-50" : ""}
                  >
                    <CardContent className="grid gap-2.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/quan-tri/hoc-vien/${student.id}`} className="line-clamp-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">{student.fullName}</Link>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{student.code}</p>
                        </div>
                        {editable && !student.archivedAt && <GripVertical aria-label="Kéo để chuyển cột" className="hidden size-4 shrink-0 cursor-grab text-muted-foreground [@media(pointer:fine)]:block" strokeWidth={1.75} />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <a href={`tel:${student.phone}`} className="font-mono text-foreground hover:text-primary">{student.phone}</a><ClipboardButton text={student.phone} label="Sao chép số điện thoại" iconOnly />
                        <span className="px-1.5">·</span>{formatDate(student.signedUpAt)}
                      </div>
                      <TrialSummary student={student} />
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                        <FollowUpBadge student={student} />
                        {editable && !student.archivedAt && <StatusCell studentId={student.id} fullName={student.fullName} status={student.status} droppedReason={student.droppedReason} droppedNote={student.droppedNote} editable />}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
              {column.rows.length === 0 && <li className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">Không có hồ sơ phù hợp</li>}
            </ul>
          </section>
        ))}
      </div>
      <DroppedReasonDialog open={intent !== null} onOpenChange={open => { if (!open) setIntent(null) }} pending={pending} preview={USE_MOCK} onConfirm={async data => { if (intent) await move(intent, data.reason, data.note) }} />
    </>
  )
}
