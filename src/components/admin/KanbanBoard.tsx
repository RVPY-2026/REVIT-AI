"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GripVertical } from "lucide-react"
import { toast } from "sonner"
import { updateKanbanStage } from "@/server/actions/enrollments"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import type { StudentSummary } from "@/lib/schemas/student"
import { ClipboardButton } from "@/components/admin/ClipboardButton"
import { FollowUpBadge } from "@/components/admin/FollowUpBadge"
import { StatusCell } from "@/components/admin/StatusCell"
import { StatusBadge } from "@/components/admin/StatusBadge"

export type KanbanColumnData = {
  status: StudentStatus
  count: number
  rows: StudentSummary[]
}

type MoveIntent = { student: StudentSummary; status: StudentStatus }
const movable = new Set<StudentStatus>(["new", "consulting", "dropped"])

export function KanbanBoard({ columns, editable }: { columns: KanbanColumnData[]; editable: boolean }) {
  const router = useRouter()
  const [intent, setIntent] = useState<MoveIntent | null>(null)
  const [pending, setPending] = useState(false)
  const [dragged, setDragged] = useState<StudentSummary | null>(null)
  const limitedColumns = columns.some((column) => column.count > column.rows.length)

  async function confirmMove() {
    if (!intent || pending) return
    setPending(true)
    try {
      const result = await updateKanbanStage({ studentId: intent.student.id, status: intent.status })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Đã chuyển trạng thái học viên")
      setIntent(null)
      router.refresh()
    } catch {
      toast.error("Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé.")
    } finally {
      setPending(false)
      setDragged(null)
    }
  }

  return (
    <>
      {limitedColumns && <p className="mb-3 rounded-lg border border-border bg-background-2 px-3 py-2 text-xs text-muted-foreground">Một số cột có hơn 100 hồ sơ. Số trên đầu cột là tổng phù hợp với bộ lọc; danh sách đang hiển thị 100 hồ sơ đầu tiên.</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {columns.map((column) => (
          <section
            key={column.status}
            className={`min-w-0 rounded-2xl border border-border bg-background-2/60 p-3 transition-colors ${dragged && movable.has(dragged.status) && movable.has(column.status) ? "border-primary bg-primary-soft/40" : ""}`}
            aria-label={`${STUDENT_STATUS_META[column.status].label}: ${column.count} học viên`}
            onDragOver={(event) => {
              if (dragged && movable.has(dragged.status) && movable.has(column.status)) event.preventDefault()
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (dragged && dragged.status !== column.status && movable.has(dragged.status) && movable.has(column.status)) {
                setIntent({ student: dragged, status: column.status })
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
                    draggable={editable && movable.has(student.status)}
                    onDragStart={() => setDragged(student)}
                    onDragEnd={() => setDragged(null)}
                    className={dragged?.id === student.id ? "opacity-50" : ""}
                  >
                    <CardContent className="grid gap-2.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/quan-tri/hoc-vien/${student.id}`} className="line-clamp-2 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">{student.fullName}</Link>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{student.code}</p>
                        </div>
                        {editable && movable.has(student.status) ? <GripVertical aria-label="Kéo để chuyển cột" className="size-4 shrink-0 cursor-grab text-muted-foreground" strokeWidth={1.75} /> : <StatusBadge status={student.status} />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <a href={`tel:${student.phone}`} className="font-mono text-foreground hover:text-primary">{student.phone}</a><ClipboardButton text={student.phone} label="Sao chép số điện thoại" iconOnly />
                        <span className="px-1.5">·</span>{formatDate(student.signedUpAt)}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                        <FollowUpBadge student={student} />
                        {editable && <StatusCell studentId={student.id} fullName={student.fullName} status={student.status} editable />}
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
      <AlertDialog open={intent !== null} onOpenChange={(open) => !open && !pending && setIntent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đổi trạng thái</AlertDialogTitle>
            <AlertDialogDescription>
              Chuyển {intent?.student.fullName} sang “{intent ? STUDENT_STATUS_META[intent.status].label : ""}”? Thay đổi sẽ được ghi vào lịch sử hồ sơ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Giữ nguyên</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); void confirmMove() }}>
              {pending ? "Đang cập nhật…" : "Xác nhận chuyển"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
