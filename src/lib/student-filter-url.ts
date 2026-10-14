import { DEFAULT_SORT_DIR, type StudentFilter } from "@/lib/schemas/student";

const BASE = "/quan-tri/hoc-vien";

type Options = { view?: "table" | "kanban"; resetPage?: boolean };

/** One place that turns a filter into a list URL, so toolbar, headers and exports agree. */
export function studentFilterParams(filter: StudentFilter, { view }: Options = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.search?.trim()) params.set("search", filter.search.trim());
  if (filter.status) params.set("status", filter.status);
  if (filter.sourceId) params.set("sourceId", filter.sourceId);
  if (filter.month) params.set("month", filter.month);
  if (filter.followUp) params.set("followUp", filter.followUp);
  if (filter.archived) params.set("archived", filter.archived);
  if (filter.quickView) params.set("quickView", filter.quickView);
  const sort = filter.sort ?? "signedUpAt";
  const dir = filter.dir ?? DEFAULT_SORT_DIR[sort];
  if (sort !== "signedUpAt" || dir !== DEFAULT_SORT_DIR.signedUpAt) { params.set("sort", sort); params.set("dir", dir); }
  if (filter.page && filter.page > 1) params.set("page", String(filter.page));
  if (filter.pageSize && filter.pageSize !== 25) params.set("pageSize", String(filter.pageSize));
  if (view === "kanban") params.set("view", "kanban");
  return params;
}

export function studentListHref(filter: StudentFilter, updates: Partial<StudentFilter> = {}, options: Options = {}): string {
  // Any filter or sort change goes back to page 1 unless the caller names a page.
  const merged = { ...filter, page: undefined, ...updates };
  const params = studentFilterParams(merged, options);
  return `${BASE}${params.size ? `?${params}` : ""}`;
}

/** Export keeps filters but not paging or sorting. */
export function studentExportHref(filter: StudentFilter): string {
  const params = studentFilterParams({ ...filter, page: undefined, pageSize: undefined, sort: undefined, dir: undefined });
  return `/api/export/students${params.size ? `?${params}` : ""}`;
}
