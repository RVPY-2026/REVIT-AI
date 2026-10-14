"use client";

import { useId, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STUDENT_STATUSES, STUDENT_STATUS_META } from "@/lib/constants";
import { DEFAULT_SORT_DIR, type StudentFilter, type StudentFollowUp, type StudentList, type StudentSort } from "@/lib/schemas/student";
import { studentListHref } from "@/lib/student-filter-url";

type Props = { filter: StudentFilter; sources: StudentList["sources"]; view?: "table" | "kanban" };

const SORT_OPTIONS: { value: StudentSort; dir: "asc" | "desc"; label: string }[] = [
  { value: "signedUpAt", dir: "desc", label: "Đăng ký mới nhất" },
  { value: "signedUpAt", dir: "asc", label: "Đăng ký cũ nhất" },
  { value: "lastContactAt", dir: "asc", label: "Lâu chưa liên hệ nhất" },
  { value: "fullName", dir: "asc", label: "Tên A → Z" },
  { value: "status", dir: "asc", label: "Trạng thái" },
];

const FOLLOW_UP_OPTIONS: { value: StudentFollowUp; label: string }[] = [
  { value: "uncontacted", label: "Chưa liên hệ" },
  { value: "overdue", label: "Quá hạn follow-up" },
];

const chipClass = (active: boolean) =>
  `inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60 ${active ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`;

/** Filters apply as soon as they are chosen; the URL stays the single source of truth. */
export function StudentFilterToolbar({ filter, sources, view = "table" }: Props) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const activeCount = [filter.status, filter.sourceId, filter.month, filter.followUp].filter(Boolean).length;
  const sort = filter.sort ?? "signedUpAt";
  const dir = filter.dir ?? DEFAULT_SORT_DIR[sort];

  function go(updates: Partial<StudentFilter>) {
    startTransition(() => router.push(studentListHref(filter, updates, { view }), { scroll: false }));
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go({ search: String(new FormData(event.currentTarget).get("search") ?? "").trim() || undefined });
  }

  return <section className="mt-6 space-y-3" aria-label="Bộ lọc học viên" aria-busy={pending}>
    <div className="flex flex-wrap gap-2">
      <form onSubmit={search} className="flex min-w-0 flex-1 basis-full gap-2 sm:basis-80">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm học viên</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <Input key={filter.search ?? ""} name="search" defaultValue={filter.search} maxLength={100} placeholder="Tên, điện thoại, email hoặc mã học viên" className="pl-10" />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>Tìm</Button>
      </form>
      <div className="flex min-w-0 flex-1 basis-full gap-2 sm:flex-none sm:basis-auto">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground sm:flex-none">
          <span className="shrink-0">Tháng</span>
          <Input type="month" aria-label="Tháng đăng ký" min="1000-01" max="9999-12" value={filter.month ?? ""} onChange={(event) => go({ month: event.target.value || undefined })} className="w-40 min-w-0 flex-1 sm:flex-none" />
        </label>
        {view === "table" && <label className="relative min-w-0 flex-1 md:hidden">
          <span className="sr-only">Sắp xếp</span>
          <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <select aria-label="Sắp xếp" value={`${sort}:${dir}`} onChange={(event) => { const [value, direction] = event.target.value.split(":"); go({ sort: value as StudentSort, dir: direction as "asc" | "desc" }); }}
            className="h-10 w-full min-w-0 appearance-none rounded-[10px] border border-input bg-transparent pr-3 pl-9 text-sm">
            {SORT_OPTIONS.map((option) => <option key={`${option.value}:${option.dir}`} value={`${option.value}:${option.dir}`}>{option.label}</option>)}
          </select>
        </label>}
      </div>
    </div>

    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" role="group" aria-label="Lọc nhanh">
      {view === "table" && <>
        <button type="button" aria-pressed={!filter.status} className={chipClass(!filter.status)} onClick={() => go({ status: undefined })}>Tất cả</button>
        {STUDENT_STATUSES.map((status) => <button key={status} type="button" aria-pressed={filter.status === status} className={chipClass(filter.status === status)} onClick={() => go({ status: filter.status === status ? undefined : status })}>{STUDENT_STATUS_META[status].label}</button>)}
        <span aria-hidden="true" className="mx-1 hidden w-px self-stretch bg-border sm:block" />
      </>}
      {FOLLOW_UP_OPTIONS.map((option) => <button key={option.value} type="button" aria-pressed={filter.followUp === option.value} className={chipClass(filter.followUp === option.value)} onClick={() => go({ followUp: filter.followUp === option.value ? undefined : option.value })}>{option.label}</button>)}
      {sources.length > 1 && <>
        <span aria-hidden="true" className="mx-1 hidden w-px self-stretch bg-border sm:block" />
        {sources.map((source) => <button key={source.id} type="button" id={`${id}-${source.id}`} aria-pressed={filter.sourceId === source.id} title={source.name} className={chipClass(filter.sourceId === source.id)} onClick={() => go({ sourceId: filter.sourceId === source.id ? undefined : source.id })}>Nguồn {source.code}</button>)}
      </>}
      {(activeCount > 0 || filter.search) && <Button type="button" variant="ghost" size="sm" disabled={pending} className="shrink-0" onClick={() => go({ status: undefined, sourceId: undefined, month: undefined, followUp: undefined, search: undefined })}>Xóa bộ lọc</Button>}
    </div>
    {pending && <p role="status" className="text-sm text-muted-foreground">Đang tải kết quả…</p>}
  </section>;
}
