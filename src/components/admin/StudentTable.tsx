"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpDown, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, dataTableFeatures } from "@/components/admin/DataTable"
import { ClipboardButton } from "@/components/admin/ClipboardButton"
import { FollowUpBadge } from "@/components/admin/FollowUpBadge"
import { StatusCell } from "@/components/admin/StatusCell"
import { DroppedReasonDialog } from "@/components/admin/DroppedReasonDialog"
import { TrialSummary } from "@/components/admin/TrialSummary"
import { DROPPED_REASON_LABELS, type DROPPED_REASONS } from "@/lib/crm"
import { StudentActionMenu } from "@/components/admin/StudentActionMenu"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { STUDENT_STATUS_META, zaloChatUrl, type StudentStatus } from "@/lib/constants"
import { isActiveStatus } from "@/lib/follow-up"
import { formatDate, formatPhone } from "@/lib/format"
import { USE_MOCK } from "@/lib/runtime-mode"
import { DEFAULT_SORT_DIR, type StudentFilter, type StudentSort, type StudentSummary } from "@/lib/schemas/student"
import { studentListHref } from "@/lib/student-filter-url"
import { bulkUpdateStudentStatus } from "@/server/actions/student-status"
import { selectStudentsByFilter } from "@/server/actions/student-selection"

type TableItem = StudentSummary

type Props = {
  rows: TableItem[]
  editable: boolean
  canExport?: boolean
  filter?: StudentFilter
  preview?: boolean
  total?: number
}

export function StudentTable({ rows, editable, canExport = false, filter = {}, preview = false, total = rows.length }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState<StudentStatus | null>(null)
  const [pending, setPending] = useState(false)
  const [matching, setMatching] = useState(false)
  const [snapshots, setSnapshots] = useState<Record<string, StudentStatus>>(() => Object.fromEntries(rows.map(row => [row.id,row.status])))
  const selectable = editable || canExport
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id))
  const blocked = USE_MOCK || preview

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))
  }
  async function applyBulk(target: "consulting" | "dropped", reason?: typeof DROPPED_REASONS[number], note?: string) {
    if (pending || blocked) { if (blocked) toast.error("Chế độ xem thử chưa lưu thay đổi."); return }
    setPending(true)
    try {
      const result = await bulkUpdateStudentStatus({ studentIds: [...selected], status: target, expectedStatuses: snapshots, ...(matching ? { filter } : {}), reason, note })
      if (!result.ok) { toast.error(result.error); return }
      toast.success(`Đã chuyển ${result.data.updated} học viên sang “${STUDENT_STATUS_META[target].label}”${result.data.skipped.length ? ` · Bỏ qua ${result.data.skipped.length} hồ sơ đã thay đổi` : ""}`)
      setSelected(new Set())
      setBulkTarget(null)
      setMatching(false)
      router.refresh()
    } catch { toast.error("Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé.") }
    finally { setPending(false) }
  }
  async function selectMatching() {
    setPending(true)
    try {
      const rows = await selectStudentsByFilter(filter)
      setSelected(new Set(rows.map(row => row.id))); setSnapshots(Object.fromEntries(rows.map(row => [row.id,row.status]))); setMatching(true)
    } catch { toast.error("Chưa thể chọn kết quả. Bạn thử lại nhé.") }
    finally { setPending(false) }
  }

  const checkbox = (checked: boolean, onChange: () => void, label: string) => (
    <label className="inline-flex size-11 md:size-9 [@media(pointer:coarse)]:size-11 items-center justify-center"><input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="size-4 cursor-pointer accent-[var(--primary)]" /></label>
  )

  const columns: Array<ColumnDef<typeof dataTableFeatures, TableItem>> = [
    ...(selectable ? [{
      id: "select",
      header: () => checkbox(allSelected, toggleAll, "Chọn tất cả học viên trên trang này"),
      cell: ({ row }) => checkbox(selected.has(row.original.id), () => toggle(row.original.id), `Chọn ${row.original.fullName}`),
    } satisfies ColumnDef<typeof dataTableFeatures, TableItem>] : []),
    {
      accessorKey: "fullName",
      header: () => <SortHeader filter={filter} sort="fullName" label="Học viên" />,
      cell: ({ row }) => (
        <div className="min-w-40">
          <Link href={`/quan-tri/hoc-vien/${row.original.id}`} className="font-medium underline-offset-4 hover:text-primary hover:underline">{row.original.fullName}</Link>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">{row.original.code}</div>
          {row.original.duplicatePhone && <span className="text-xs text-warning">Trùng SĐT</span>}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Liên hệ",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <div className="flex items-center gap-1"><span className="font-mono text-[13px]">{formatPhone(row.original.phone)}</span><ClipboardButton text={row.original.phone} label="Sao chép số điện thoại" iconOnly /></div>
          <div className="mt-0.5 max-w-44 truncate text-xs text-muted-foreground">{row.original.email ?? "Chưa có email"}</div>
        </div>
      ),
    },
    {
      accessorFn: (row) => row.sourceCode,
      id: "source",
      header: "Nguồn",
      cell: ({ row }) => <span className="font-mono font-medium" title={row.original.sourceName}>{row.original.sourceCode}</span>,
    },
    {
      accessorKey: "status",
      header: () => <SortHeader filter={filter} sort="status" label="Trạng thái" />,
      cell: ({ row }) => <div><StatusCell studentId={row.original.id} fullName={row.original.fullName} status={row.original.status} droppedReason={row.original.droppedReason} droppedNote={row.original.droppedNote} editable={editable && !row.original.archivedAt} preview={preview} />{row.original.status === "dropped" && row.original.droppedReason && <p className="mt-1 text-xs text-muted-foreground" title={row.original.droppedNote ?? undefined}>{DROPPED_REASON_LABELS[row.original.droppedReason]}</p>}</div>,
    },
    { id: "trial", header: "Học thử", cell: ({ row }) => <TrialSummary student={row.original} /> },
    {
      id: "lastContactAt",
      header: () => <SortHeader filter={filter} sort="lastContactAt" label="Liên hệ gần nhất" />,
      cell: ({ row }) => isActiveStatus(row.original.status) ? <FollowUpBadge student={row.original} /> : <span className="text-muted-foreground"><span aria-hidden="true">—</span><span className="sr-only">Không cần liên hệ</span></span>,
    },
    {
      accessorKey: "signedUpAt",
      header: () => <SortHeader filter={filter} sort="signedUpAt" label="Đăng ký" />,
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{formatDate(row.original.signedUpAt)}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Thao tác</span>,
      cell: ({ row }) => <StudentActionMenu studentId={row.original.id} fullName={row.original.fullName} phone={row.original.phone} email={row.original.email} status={row.original.status} editable={editable} canEditContact={editable} preview={preview} />,
    },
  ]

  const selectedIds = [...selected]
  return <>
    {allSelected && !matching && total > rows.length && <Button variant="outline" className="mb-3 h-auto min-h-11 whitespace-normal" disabled={pending} onClick={() => { void selectMatching() }}>Chọn tất cả {total} kết quả khớp bộ lọc</Button>}
    {matching && total > 100 && <p role="status" className="mb-3 text-sm text-warning">Có {total} kết quả. Mỗi lần chỉ chọn tối đa 100 hồ sơ; bạn thu hẹp bộ lọc để xử lý tiếp.</p>}
    <DataTable columns={columns} data={rows} rowKey={(student) => student.id} mobileCards={(student) => <StudentCard student={student} editable={editable} preview={preview} selected={selectable ? selected.has(student.id) : undefined} onToggle={() => toggle(student.id)} />} />
    {selected.size > 0 && <div role="region" aria-label="Thao tác với học viên đã chọn" className="sticky bottom-20 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary bg-popover p-3 shadow-lg md:bottom-4">
      <p className="mr-auto text-sm font-medium"><span className="font-mono tabular-nums">{selected.size}</span> học viên đã chọn</p>
      {editable && <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="compact">Đổi trạng thái</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="min-h-11" onSelect={() => { void applyBulk("consulting") }}>{STUDENT_STATUS_META.consulting.label}</DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => setBulkTarget("dropped")}>{STUDENT_STATUS_META.dropped.label}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>}
      {canExport && <Button asChild variant="outline" size="compact"><a href={`/api/export/students?ids=${selectedIds.join(",")}`}><ArrowDownToLine aria-hidden="true" strokeWidth={1.75} />Xuất Excel</a></Button>}
      <Button type="button" variant="ghost" size="compact" onClick={() => { setSelected(new Set()); setMatching(false) }}>Bỏ chọn</Button>
    </div>}
    <DroppedReasonDialog open={bulkTarget === "dropped"} onOpenChange={open => { if (!open) setBulkTarget(null) }} pending={pending} preview={blocked} onConfirm={async data => { await applyBulk("dropped", data.reason, data.note) }} />
  </>
}

/** Server-driven sort: the header is a link, so the sorted list is shareable and survives refresh. */
function SortHeader({ filter, sort, label }: { filter: StudentFilter; sort: StudentSort; label: string }) {
  const active = (filter.sort ?? "signedUpAt") === sort
  const dir = filter.dir ?? DEFAULT_SORT_DIR[filter.sort ?? "signedUpAt"]
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : DEFAULT_SORT_DIR[sort]
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return <Link href={studentListHref(filter, { sort, dir: nextDir })} scroll={false} aria-label={`Sắp xếp theo ${label}`} className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}>
    {label}<Icon aria-hidden="true" size={13} strokeWidth={1.75} className={active ? "" : "opacity-50"} />
  </Link>
}

function StudentCard({ student, editable, preview, selected, onToggle }: { student: TableItem; editable: boolean; preview: boolean; selected?: boolean; onToggle: () => void }) {
  return (
    <article className={`grid gap-3 rounded-2xl border bg-card p-4 ${selected ? "border-primary" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {selected !== undefined && <label className="inline-flex size-11 shrink-0 items-center justify-center"><input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Chọn ${student.fullName}`} className="size-5 cursor-pointer accent-[var(--primary)]" /></label>}
          <div className="min-w-0">
            <Link href={`/quan-tri/hoc-vien/${student.id}`} className="font-medium underline-offset-4 hover:text-primary hover:underline">{student.fullName}</Link>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{student.code} · nguồn {student.sourceCode}</p>
          </div>
        </div>
        <StatusCell studentId={student.id} fullName={student.fullName} status={student.status} droppedReason={student.droppedReason} droppedNote={student.droppedNote} editable={editable && !student.archivedAt} preview={preview} />
      </div>
      {student.duplicatePhone && <span className="text-xs text-warning">Trùng SĐT</span>}
      {student.status === "dropped" && student.droppedReason && <p className="text-xs text-muted-foreground" title={student.droppedNote ?? undefined}>{DROPPED_REASON_LABELS[student.droppedReason]}</p>}
      <TrialSummary student={student} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <FollowUpBadge student={student} />
        <span className="text-muted-foreground tabular-nums">Đăng ký {formatDate(student.signedUpAt)}</span>
      </div>
      <div className="flex items-center gap-1 text-sm"><span className="font-mono text-[13px]">{formatPhone(student.phone)}</span><ClipboardButton text={student.phone} label="Sao chép số điện thoại" iconOnly /></div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button asChild size="compact" variant="outline"><a href={zaloChatUrl(student.phone)} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" strokeWidth={1.75} />Mở Zalo</a></Button>
        <Button asChild variant="ghost" size="compact"><Link href={`/quan-tri/hoc-vien/${student.id}`}>Mở hồ sơ</Link></Button>
      </div>
    </article>
  )
}
