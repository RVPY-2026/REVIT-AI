"use client";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ZaloQueueRetry } from "@/components/admin/ZaloQueueRetry";
import type { ZaloRow } from "@/lib/schemas/admin-viewers";
import { formatDateTime } from "@/lib/format";
export function ZaloQueueList({ rows }: { rows: ZaloRow[] }) {
  const student = (r: ZaloRow) => <Link className="block min-h-11 max-w-44 py-1 hover:underline focus-visible:ring-2 focus-visible:ring-ring" href={`/quan-tri/hoc-vien/${r.studentId}`}><span className="font-mono text-xs">{r.studentCode}</span><span className="block truncate" title={r.studentName}>{r.studentName}</span></Link>;
  const status = (r: ZaloRow) => <StatusBadge status={r.status as "pending" | "sent" | "failed"} />;
  const kind = (r: ZaloRow) => r.kind === "photo" ? "Ảnh" : "Tin nhắn";
  const columns: DataTableColumn<ZaloRow>[] = [
    { id: "time", header: "Tạo lúc", cell: ({ row }) => <p className="font-mono text-xs">{formatDateTime(row.original.createdAt)}</p> },
    { id: "student", header: "Học viên", cell: ({ row }) => student(row.original) },
    { id: "kind", header: "Loại tin", cell: ({ row }) => kind(row.original) },
    { id: "status", header: "Trạng thái", cell: ({ row }) => status(row.original) },
    { id: "attempts", header: () => <p className="text-right">Số lần thử</p>, cell: ({ row }) => <p className="text-right font-mono tabular-nums">{row.original.attempts}</p> },
    { id: "retry", header: "Lần thử tiếp", cell: ({ row }) => <p className="font-mono text-xs">{row.original.status === "pending" ? formatDateTime(row.original.availableAt) : "—"}</p> },
    { id: "error", header: "Lỗi gần nhất", cell: ({ row }) => <p className="max-w-40 truncate" title={row.original.lastError ?? ""}>{row.original.lastError ?? "—"}</p> },
    { id: "actions", header: "Thao tác", cell: ({ row }) => row.original.status === "failed" ? <ZaloQueueRetry id={row.original.id} name={row.original.studentCode} /> : null },
  ];
  return <DataTable ariaLabel="Hàng đợi Zalo" columns={columns} data={rows} rowKey={(r) => r.id} mobileCards={(r) => <article className="min-w-0 space-y-3 rounded-2xl border bg-card p-4"><div className="flex items-start justify-between gap-2">{student(r)}{status(r)}</div>
    <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Tạo lúc</dt><dd className="font-mono text-xs">{formatDateTime(r.createdAt)}</dd></div><div><dt className="text-muted-foreground">Loại tin</dt><dd>{kind(r)}</dd></div><div><dt className="text-muted-foreground">Số lần thử</dt><dd className="font-mono">{r.attempts}</dd></div><div><dt className="text-muted-foreground">Lần thử tiếp</dt><dd className="font-mono text-xs">{r.status === "pending" ? formatDateTime(r.availableAt) : "—"}</dd></div></dl>
    {r.lastError && <p className="break-words text-sm text-destructive">{r.lastError}</p>}{r.status === "failed" && <ZaloQueueRetry id={r.id} name={r.studentCode} />}</article>} />;
}
