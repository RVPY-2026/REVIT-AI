"use client";

import { useId, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STUDENT_STATUSES, STUDENT_STATUS_META } from "@/lib/constants";
import { DEFAULT_SORT_DIR, type StudentFilter, type StudentFollowUp, type StudentList, type StudentSort } from "@/lib/schemas/student";
import { studentListHref } from "@/lib/student-filter-url";
import { CrmSelect } from "@/components/admin/CrmSelect";
import { StudentMonthPicker } from "@/components/admin/StudentMonthPicker";

type Props = { filter: StudentFilter; sources: StudentList["sources"]; view?: "table" | "kanban"; admin?: boolean; counts?: StudentList["counts"]; dueCount?: number };

const SORT_OPTIONS: { value: StudentSort; dir: "asc" | "desc"; label: string }[] = [
  { value: "signedUpAt", dir: "desc", label: "Đăng ký mới nhất" },
  { value: "signedUpAt", dir: "asc", label: "Đăng ký cũ nhất" },
  { value: "lastContactAt", dir: "asc", label: "Lâu chưa liên hệ nhất" },
  { value: "fullName", dir: "asc", label: "Tên A → Z" },
  { value: "status", dir: "asc", label: "Trạng thái" },
  { value: "nextActionAt", dir: "asc", label: "Lịch hẹn rồi liên hệ cũ nhất" },
];

const FOLLOW_UP_OPTIONS: { value: StudentFollowUp; label: string }[] = [
  { value: "due", label: "Đến hạn hôm nay" },
  { value: "uncontacted", label: "Chưa liên hệ" },
  { value: "overdue", label: "Quá hạn follow-up" },
];

const chipClass = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 ${active ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`;

/** Filters apply as soon as they are chosen; the URL stays the single source of truth. */
export function StudentFilterToolbar({ filter, sources, view = "table", admin = false, counts, dueCount }: Props) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const activeCount = [filter.status, filter.sourceId, filter.month, filter.followUp, filter.archived].filter(Boolean).length;
  const sort = filter.sort ?? "signedUpAt";
  const dir = filter.dir ?? DEFAULT_SORT_DIR[sort];

  function go(updates: Partial<StudentFilter>) {
    startTransition(() => router.push(studentListHref(filter, updates, { view }), { scroll: false }));
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go({ search: String(new FormData(event.currentTarget).get("search") ?? "").trim() || undefined });
  }

  return <section className="mt-6 min-w-0 space-y-3" aria-label="Bộ lọc học viên" aria-busy={pending}>
    <div role="group" aria-label="Chế độ xử lý" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={filter.followUp === "due"} className={chipClass(filter.followUp === "due")} onClick={() => go({ followUp: "due", sort: "nextActionAt", dir: "asc", quickView: undefined, archived: undefined })}>Cần xử lý{dueCount !== undefined && ` (${dueCount})`}</button>
      <button type="button" aria-pressed={!filter.followUp} className={chipClass(!filter.followUp)} onClick={() => go({ followUp: undefined, sort: "signedUpAt", dir: "desc", quickView: "all" })}>Tất cả</button>
      {admin && <button type="button" aria-pressed={Boolean(filter.archived)} className={chipClass(Boolean(filter.archived))} onClick={() => go({ archived: filter.archived ? undefined : "true", followUp: undefined, quickView: "all" })}>Đã lưu trữ</button>}
    </div>
    <div className="flex flex-wrap gap-2">
      <form onSubmit={search} className="flex min-w-0 flex-1 basis-full gap-2 sm:basis-80">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm học viên</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <Input key={filter.search ?? ""} name="search" defaultValue={filter.search} maxLength={100} placeholder="Tên, điện thoại, email hoặc mã học viên" className="pl-10" />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>Tìm</Button>
      </form>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <StudentMonthPicker value={filter.month} onChange={month => go({ month })} disabled={pending} />
        {view === "table" && <CrmSelect label="Sắp xếp" value={`${sort}:${dir}`} options={SORT_OPTIONS.map(option => ({ value: `${option.value}:${option.dir}`, label: option.label }))} onChange={value => { const [sort, dir] = value.split(":"); go({ sort: sort as StudentSort, dir: dir as "asc" | "desc" }); }} disabled={pending} />}
        {view === "table" && <CrmSelect label="Số học viên mỗi trang" value={String(filter.pageSize ?? 25)} options={[25,50,100].map(size => ({ value: String(size), label: `${size} / trang` }))} onChange={value => go({ pageSize: Number(value) })} disabled={pending} />}
      </div>
    </div>

    <div className="flex max-w-full gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible" role="group" aria-label="Lọc nhanh">
      {view === "table" && <>
        <button type="button" aria-pressed={!filter.status} className={chipClass(!filter.status)} onClick={() => go({ status: undefined })}>Mọi trạng thái{counts && ` (${Object.values(counts).reduce((sum,n) => sum+n,0)})`}</button>
        {STUDENT_STATUSES.map((status) => <button key={status} type="button" aria-pressed={filter.status === status} className={chipClass(filter.status === status)} onClick={() => go({ status: filter.status === status ? undefined : status })}>{STUDENT_STATUS_META[status].label}{counts && ` (${counts[status]})`}</button>)}
        <span aria-hidden="true" className="mx-1 hidden w-px self-stretch bg-border sm:block" />
      </>}
      {FOLLOW_UP_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={filter.followUp === option.value} className={chipClass(filter.followUp === option.value)} onClick={() => go({ followUp: filter.followUp === option.value ? undefined : option.value })}>{option.label}</button>)}
      {sources.length > 1 && <>
        <span aria-hidden="true" className="mx-1 hidden w-px self-stretch bg-border sm:block" />
        {sources.map((source) => <button key={source.id} type="button" id={`${id}-${source.id}`} aria-pressed={filter.sourceId === source.id} title={source.name} className={chipClass(filter.sourceId === source.id)} onClick={() => go({ sourceId: filter.sourceId === source.id ? undefined : source.id })}>Nguồn {source.code}</button>)}
      </>}
      {(activeCount > 0 || filter.search) && <Button type="button" variant="ghost" size="compact" disabled={pending} className="shrink-0" onClick={() => go({ status: undefined, sourceId: undefined, month: undefined, followUp: undefined, search: undefined, archived: undefined, quickView: "all" })}>Xóa bộ lọc ({activeCount})</Button>}
    </div>
    {pending && <p role="status" className="text-sm text-muted-foreground">Đang tải kết quả…</p>}
  </section>;
}
