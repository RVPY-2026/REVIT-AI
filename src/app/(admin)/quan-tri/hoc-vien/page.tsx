import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowDownToLine, ArrowLeft, ArrowRight, SearchX, UsersRound } from "lucide-react"
import { StudentTable } from "@/components/admin/StudentTable"
import { ManualStudentDialog } from "@/components/admin/ManualStudentDialog"
import { KanbanBoard } from "@/components/admin/KanbanBoard"
import { ViewSwitch } from "@/components/admin/ViewSwitch"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StudentFilterToolbar } from "@/components/admin/StudentFilterToolbar"
import { Skeleton } from "@/components/ui/skeleton"
import { studentFilterSchema, type StudentFilter } from "@/lib/schemas/student"
import { listStudents, getStudentKanban, getStudentSources } from "@/lib/api/students"
import { requirePermission } from "@/server/auth/session"
import { can } from "@/lib/auth/permissions"
import { paginationRange } from "@/lib/pagination"
import { studentExportHref, studentListHref } from "@/lib/student-filter-url"

export const metadata: Metadata = {
  title: "Học viên · Quản lý RVPY",
  robots: { index: false, follow: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<StudentsLoading />}>
      <StudentsContent searchParams={searchParams} />
    </Suspense>
  )
}

async function StudentsContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const first = (value: string | string[] | undefined) => typeof value === "string" ? value : undefined
  const parsed = studentFilterSchema.safeParse({
    search: params.search,
    status: params.status,
    sourceId: params.sourceId,
    month: params.month,
    page: params.page,
    pageSize: params.pageSize,
    followUp: params.followUp,
    sort: params.sort,
    dir: params.dir,
  })
  const user = await requirePermission("students.view")
  if (!parsed.success || Object.values(params).some(Array.isArray)) {
    return <main className="content grid justify-items-start gap-4 py-8"><h1 className="text-[28px] font-light">Bộ lọc chưa hợp lệ</h1><p role="alert" className="text-muted-foreground">Bạn kiểm tra từ khóa, tháng đăng ký và bộ lọc trong đường dẫn, hoặc chọn lại bộ lọc.</p><Button asChild variant="outline"><Link href="/quan-tri/hoc-vien">Chọn lại bộ lọc</Link></Button></main>
  }
  const filter: StudentFilter = parsed.data
  const editable = can(user, "students.edit")
  const canExport = can(user, "students.export")
  const kanban = first(params.view) === "kanban"
  const actions = (sources: Parameters<typeof ManualStudentDialog>[0]["sources"]) => (
    <div className="flex flex-wrap items-center gap-2">
      <ViewSwitch filter={filter} view={kanban ? "kanban" : "table"} />
      {canExport && <Button asChild variant="outline" size="sm"><Link href={studentExportHref(filter)}><ArrowDownToLine aria-hidden="true" strokeWidth={1.75} />Xuất Excel</Link></Button>}
      {can(user, "students.create") && <ManualStudentDialog sources={sources} />}
    </div>
  )

  if (kanban) {
    const [{ columns }, sources] = await Promise.all([getStudentKanban(filter), getStudentSources()])
    return (
      <main className="content py-8 sm:py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground">QUẢN LÝ · HỌC VIÊN</p>
            <h1 className="mt-2 font-heading text-[28px] font-light text-foreground">Bảng trạng thái</h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">Kéo thẻ hoặc dùng nút chuyển để cập nhật trạng thái tư vấn.</p>
          </div>
          {actions(sources)}
        </div>
        <StudentFilterToolbar filter={filter} sources={sources} view="kanban" />
        <div className="mt-5">
          <KanbanBoard columns={columns} editable={editable} />
        </div>
      </main>
    )
  }

  const result = await listStudents(filter)
  const { page, pageCount, start, end } = paginationRange(result.total, result.page, result.pageSize)
  if (page !== result.page) redirect(studentListHref(filter, { page }))
  const filtered = Boolean(filter.search || filter.status || filter.sourceId || filter.month || filter.followUp)

  return (
    <main className="content py-8 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">QUẢN LÝ · HỌC VIÊN</p>
          <h1 className="mt-2 font-heading text-[28px] font-light text-foreground">Học viên</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">Theo dõi hồ sơ, trạng thái tư vấn và nguồn đăng ký.</p>
        </div>
        {actions(result.sources)}
      </div>

      <StudentFilterToolbar filter={filter} sources={result.sources} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p aria-live="polite">{result.total === 0 ? "Không có học viên nào" : `Đang hiển thị ${start}–${end} trong tổng số ${result.total} học viên`}</p>
      </div>

      {result.rows.length ? (
        <div className="mt-3">
          <StudentTable rows={result.rows} editable={editable} canExport={canExport} filter={filter} />
          <nav aria-label="Phân trang danh sách học viên" className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Trang {result.page} / {pageCount}</span>
            <div className="flex gap-2">
              {result.page <= 1 ? (
                <Button type="button" variant="outline" size="sm" disabled><ArrowLeft aria-hidden="true" strokeWidth={1.75} />Trang trước</Button>
              ) : (
                <Button asChild variant="outline" size="sm"><Link href={studentListHref(filter, { page: result.page - 1 })}><ArrowLeft aria-hidden="true" strokeWidth={1.75} />Trang trước</Link></Button>
              )}
              {result.page >= pageCount ? (
                <Button type="button" variant="outline" size="sm" disabled>Trang sau<ArrowRight aria-hidden="true" strokeWidth={1.75} /></Button>
              ) : (
                <Button asChild variant="outline" size="sm"><Link href={studentListHref(filter, { page: result.page + 1 })}>Trang sau<ArrowRight aria-hidden="true" strokeWidth={1.75} /></Link></Button>
              )}
            </div>
          </nav>
        </div>
      ) : (
        <Card className="mt-3 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            {filtered ? <SearchX aria-hidden="true" className="size-8 text-muted-foreground" strokeWidth={1.5} /> : <UsersRound aria-hidden="true" className="size-8 text-muted-foreground" strokeWidth={1.5} />}
            <h2 className="mt-4 font-heading text-lg font-medium">{filtered ? "Không có học viên khớp bộ lọc" : "Chưa có học viên nào"}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{filtered ? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc để xem thêm hồ sơ." : "Học viên sẽ xuất hiện ở đây khi có người điền form đăng ký học thử hoặc khi bạn thêm thủ công."}</p>
            {filtered && <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/quan-tri/hoc-vien">Xóa bộ lọc</Link></Button>}
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function StudentsLoading() {
  return <main className="content space-y-5 py-8" aria-label="Đang tải danh sách học viên"><div className="space-y-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-9 w-52" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-11 w-full" /><Skeleton className="h-24 w-full rounded-2xl" /><div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div></main>
}
