import Link from "next/link"
import { LayoutGrid, List } from "lucide-react"
import { studentListHref } from "@/lib/student-filter-url"
import type { StudentFilter } from "@/lib/schemas/student"

/** Segmented control for the two list views; links keep the active filters. */
export function ViewSwitch({ filter, view }: { filter: StudentFilter; view: "table" | "kanban" }) {
  const items = [
    { key: "table", label: "Bảng", Icon: List },
    { key: "kanban", label: "Kanban", Icon: LayoutGrid },
  ] as const
  return <nav aria-label="Chế độ xem" className="inline-flex rounded-lg border border-border bg-background-2 p-0.5">
    {items.map(({ key, label, Icon }) => <Link key={key} href={studentListHref(filter, {}, { view: key })} aria-current={view === key ? "page" : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${view === key ? "bg-card font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} />{label}
    </Link>)}
  </nav>
}
