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
import { StudentActionMenu } from "@/components/admin/StudentActionMenu"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { STUDENT_STATUSES, STUDENT_STATUS_META, zaloChatUrl, type StudentStatus } from "@/lib/constants"
import { isActiveStatus } from "@/lib/follow-up"
import { formatDate, formatPhone } from "@/lib/format"
import { USE_MOCK } from "@/lib/runtime-mode"
import { DEFAULT_SORT_DIR, type StudentFilter, type StudentSort, type StudentSummary } from "@/lib/schemas/student"
import { studentListHref } from "@/lib/student-filter-url"
import { bulkUpdateStudentStatus } from "@/server/actions/student-status"

type TableItem = StudentSummary

type Props = {
  rows: TableItem[]
  editable: boolean
  canExport?: boolean
  filter?: StudentFilter
  preview?: boolean
}

export function StudentTable({ rows, editable, canExport = false, filter = {}, preview = false }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState<StudentStatus | null>(null)
  const [pending, setPending] = useState(false)
  const selectable = editable || canExport
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id))
  const blocked = USE_MOCK || preview

  function toggle(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))
  }
  async function applyBulk() {
    if (!bulkTarget || pending || blocked) return
    setPending(true)
    try {
      const result = await bulkUpdateStudentStatus({ studentIds: [...selected], status: bulkTarget })
      if (!result.ok) { toast.error(result.error); return }
      toast.success(`Đã chuyển ${result.data.updated} học viên sang “${STUDENT_STATUS_META[bulkTarget].label}”`)
      setSelected(new Set())
      setBulkTarget(null)
      router.refresh()
    } catch { toast.error("Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé.") }
    finally { setPending(false) }
  }

  const checkbox = (checked: boolean, onChange: () => void, label: string) => (
    <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="size-4 cursor-pointer accent-[var(--primary)]" />
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
      cell: ({ row }) => <StatusCell studentId={row.original.id} fullName={row.original.fullName} status={row.original.status} editable={editable} preview={preview} />,
    },
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
    <DataTable columns={columns} data={rows} rowKey={(student) => student.id} mobileCards={(student) => <StudentCard student={student} editable={editable} preview={preview} selected={selectable ? selected.has(student.id) : undefined} onToggle={() => toggle(student.id)} />} />
    {selected.size > 0 && <div role="region" aria-label="Thao tác với học viên đã chọn" className="sticky bottom-20 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary bg-popover p-3 shadow-lg md:bottom-4">
      <p className="mr-auto text-sm font-medium"><span className="font-mono tabular-nums">{selected.size}</span> học viên đã chọn</p>
      {editable && <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm">Đổi trạng thái</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {STUDENT_STATUSES.map((status) => <DropdownMenuItem key={status} onSelect={() => setBulkTarget(status)}>{STUDENT_STATUS_META[status].label}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>}
      {canExport && <Button asChild variant="outline" size="sm"><a href={`/api/export/students?ids=${selectedIds.join(",")}`}><ArrowDownToLine aria-hidden="true" strokeWidth={1.75} />Xuất Excel</a></Button>}
      <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
    </div>}
    <AlertDialog open={bulkTarget !== null} onOpenChange={(open) => { if (!open && !pending) setBulkTarget(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Đổi trạng thái {selected.size} học viên?</AlertDialogTitle>
          <AlertDialogDescription>
            Tất cả học viên đã chọn sẽ chuyển sang “{bulkTarget ? STUDENT_STATUS_META[bulkTarget].label : ""}”. Mỗi thay đổi được ghi vào lịch sử hồ sơ; thao tác này không kích hoạt quyền học hay thay đổi học phí.
            {blocked && " Chế độ xem thử chưa lưu thay đổi."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Giữ nguyên</AlertDialogCancel>
          <AlertDialogAction disabled={pending || blocked} onClick={(event) => { event.preventDefault(); void applyBulk() }}>{pending ? "Đang lưu…" : "Xác nhận đổi"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
          {selected !== undefined && <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Chọn ${student.fullName}`} className="mt-1 size-5 shrink-0 cursor-pointer accent-[var(--primary)]" />}
          <div className="min-w-0">
            <Link href={`/quan-tri/hoc-vien/${student.id}`} className="font-medium underline-offset-4 hover:text-primary hover:underline">{student.fullName}</Link>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{student.code} · nguồn {student.sourceCode}</p>
          </div>
        </div>
        <StatusCell studentId={student.id} fullName={student.fullName} status={student.status} editable={editable} preview={preview} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <FollowUpBadge student={student} />
        <span className="text-muted-foreground tabular-nums">Đăng ký {formatDate(student.signedUpAt)}</span>
      </div>
      <div className="flex items-center gap-1 text-sm"><span className="font-mono text-[13px]">{formatPhone(student.phone)}</span><ClipboardButton text={student.phone} label="Sao chép số điện thoại" iconOnly /></div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button asChild size="sm" variant="outline"><a href={zaloChatUrl(student.phone)} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" strokeWidth={1.75} />Mở Zalo</a></Button>
        <Button asChild variant="ghost" size="sm"><Link href={`/quan-tri/hoc-vien/${student.id}`}>Mở hồ sơ</Link></Button>
      </div>
    </article>
  )
}
