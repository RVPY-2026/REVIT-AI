"use client";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { ClipboardButton } from "@/components/admin/ClipboardButton";
import { auditActionLabel, AUDIT_ENTITIES, AUDIT_FIELDS, auditValue } from "@/lib/audit-labels";
import type { AuditRow } from "@/lib/schemas/admin-viewers";
import { formatDateTime } from "@/lib/format";
export function AuditLogList({ rows }: { rows: AuditRow[] }) {
  const columns: DataTableColumn<AuditRow>[] = [
    { id: "time", header: "Thời gian", cell: ({ row }) => <time className="whitespace-nowrap font-mono text-xs" dateTime={row.original.createdAt}>{formatDateTime(row.original.createdAt)}</time> },
    { id: "actor", header: "Người thực hiện", cell: ({ row }) => <p className="max-w-36 truncate" title={row.original.actor}>{row.original.actor}</p> },
    { id: "event", header: "Hoạt động", cell: ({ row }) => <AuditDetails row={row.original} /> },
  ];
  return <DataTable ariaLabel="Nhật ký hoạt động" columns={columns} data={rows} rowKey={(r) => r.id} mobileCards={(r) => <article className="min-w-0 rounded-2xl border bg-card p-4"><time className="font-mono text-xs text-muted-foreground" dateTime={r.createdAt}>{formatDateTime(r.createdAt)}</time><div className="mt-3"><AuditDetails row={r} /></div></article>} />;
}
function AuditDetails({ row }: { row: AuditRow }) {
  const [json, setJson] = useState(false);
  const data = row.data && typeof row.data === "object" ? row.data as Record<string, unknown> : {};
  const from = data.from ?? data.before; const to = data.to ?? data.after;
  const transition = from !== undefined && to !== undefined && typeof from !== "object" && typeof to !== "object" ? `: ${auditValue(from)} → ${auditValue(to)}` : "";
  return <div className="min-w-0 space-y-2"><p className="break-words text-sm">{row.actor} {auditActionLabel(row.action)} {auditValue(data.code ?? row.entityLabel ?? row.entityId ?? "")}{transition}</p>
    <details className="text-sm"><summary className="min-h-11 cursor-pointer py-3 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Chi tiết</summary>
      <p className="mb-2 break-all text-xs text-muted-foreground">{Object.hasOwn(AUDIT_ENTITIES, row.entity) ? AUDIT_ENTITIES[row.entity] : row.entity} · {row.entityId ?? "Chưa có mã"}</p>
      <ValueList value={data} />
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => setJson(!json)}>{json ? "Ẩn JSON" : "Xem JSON"}</Button><ClipboardButton className="min-h-11" text={row.id} label="Sao chép mã hoạt động" /></div>
      {json && <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg border bg-background-2 p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>}
    </details></div>;
}
function ValueList({ value }: { value: Record<string, unknown> }) {
  return <dl className="grid gap-2">{Object.entries(value).map(([key, item]) => <div key={key} className="min-w-0 border-l-2 border-border pl-3"><dt className="text-xs text-muted-foreground">{Object.hasOwn(AUDIT_FIELDS, key) ? AUDIT_FIELDS[key] : key}</dt><dd className="mt-1 break-all">{item && typeof item === "object" ? <ValueList value={item as Record<string, unknown>} /> : auditValue(item)}</dd></div>)}</dl>;
}
