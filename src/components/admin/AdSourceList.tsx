"use client";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ClipboardButton } from "@/components/admin/ClipboardButton";
import { AdSourceDialog } from "@/components/admin/AdSourceDialog";
import { ManagementEmpty } from "@/components/admin/ManagementEmpty";
import { USE_MOCK } from "@/lib/runtime-mode";
import type { AdSource, SourceOwner } from "@/lib/schemas/ad-source";
import { updateAdSource } from "@/server/actions/ad-sources";
const rate = (value: number | null) => value === null ? "—" : `${(value * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
export function AdSourceList({ rows, owners }: { rows: AdSource[]; owners: SourceOwner[] }) {
  const columns: DataTableColumn<AdSource>[] = [
    { id: "source", header: "Nguồn", cell: ({ row }) => <SourceDetail source={row.original} /> },
    { id: "owner", header: "Người phụ trách", cell: ({ row }) => <Owner source={row.original} /> },
    { id: "active", header: "Trạng thái", cell: ({ row }) => <StatusBadge status={row.original.active ? "active" : "inactive"} /> },
    ...([ ["monthLeads", "Tháng này"], ["total", "Tổng hồ sơ"], ["enrolled", "Chính thức"], ["conversion", "Tỷ lệ"] ] as const).map(([key, label]) => ({ id: key,
      header: () => <div className="text-right">{label}</div>, cell: ({ row }: { row: { original: AdSource } }) => <p className="text-right font-mono tabular-nums">{key === "conversion" ? rate(row.original.conversion) : row.original[key]}</p> })),
    { id: "actions", header: "Thao tác", cell: ({ row }) => <div className="flex flex-col gap-2"><AdSourceDialog source={row.original} owners={owners} usedCodes={rows.map((r) => r.code)} /><SourceToggle source={row.original} /></div> },
  ];
  return <div className="mt-6">{!rows.length ? <ManagementEmpty><p>Chưa có nguồn quảng cáo. Bạn thêm nguồn để nhận học viên.</p></ManagementEmpty> : <DataTable ariaLabel="Danh sách nguồn quảng cáo" columns={columns} data={rows} rowKey={(r) => r.id} mobileCards={(r) => <article className="min-w-0 space-y-3 rounded-2xl border bg-card p-4">
    <div className="flex items-start justify-between gap-2"><SourceDetail source={r} /><StatusBadge status={r.active ? "active" : "inactive"} /></div><Owner source={r} />
    <dl className="grid grid-cols-2 gap-3 text-sm">{[["Tháng này", r.monthLeads], ["Tổng hồ sơ", r.total], ["Chính thức", r.enrolled], ["Tỷ lệ", rate(r.conversion)]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-mono tabular-nums">{value}</dd></div>)}</dl>
    <div className="flex flex-wrap gap-2"><AdSourceDialog source={r} owners={owners} usedCodes={rows.map((r) => r.code)} /><SourceToggle source={r} /></div>
  </article>} />}
    <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">Đang hiển thị {rows.length ? 1 : 0}–{rows.length} trong tổng số {rows.length}</p>
  </div>;
}
function Owner({ source }: { source: AdSource }) { return <div className="min-w-0 max-w-48"><p className="truncate" title={source.ownerName ?? "Chưa gán"}>{source.ownerName ?? "Chưa gán"}</p><p className="truncate text-xs text-muted-foreground" title={source.ownerEmail ?? ""}>{source.ownerEmail}</p></div>; }
function SourceDetail({ source: s }: { source: AdSource }) {
  return <Sheet><SheetTrigger asChild><Button variant="ghost" className="min-h-11 max-w-44 justify-start gap-2 px-0 text-left"><span className="font-mono">{s.code}</span><span className="truncate" title={s.name}>{s.name}</span></Button></SheetTrigger>
    <SheetContent showCloseButton={false} className="w-full! max-w-xl! overflow-y-auto shadow-none"><SheetHeader><SheetTitle className="break-words">Nguồn {s.code} · {s.name}</SheetTitle><SheetDescription>Hồ sơ đăng ký trong 6 tháng gần nhất.</SheetDescription></SheetHeader>
      <div className="space-y-5 px-4 pb-6"><ClipboardButton className="min-h-11" text={s.code} label="Sao chép mã nguồn" />
        <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Số hồ sơ theo tháng</caption><thead><tr>{["Tháng", "Hồ sơ mới", "Tổng hồ sơ", "Chính thức", "Tỷ lệ"].map((h) => <th key={h} scope="col" className="border-b py-3 text-right first:text-left">{h}</th>)}</tr></thead><tbody>{s.months.map((m) => <tr key={m.month}><th scope="row" className="border-b py-3 text-left font-normal">{m.month.split("-").reverse().join("/")}</th><td className="border-b text-right font-mono">{m.leads}</td><td className="border-b text-right font-mono">{m.total}</td><td className="border-b text-right font-mono">{m.enrolled}</td><td className="border-b text-right font-mono">{rate(m.total ? m.enrolled / m.total : null)}</td></tr>)}</tbody></table></div>
        <Button variant="outline" asChild className="min-h-11 w-full whitespace-normal"><Link href={`/quan-tri/hoc-vien?sourceId=${USE_MOCK ? `mock-source-${s.code.toLowerCase()}` : s.id}`}>Xem học viên của nguồn này</Link></Button>
        <SheetCloseButton />
      </div>
    </SheetContent></Sheet>;
}
import { SheetClose } from "@/components/ui/sheet";
function SheetCloseButton() { return <SheetClose asChild><Button variant="ghost" className="min-h-11">Đóng chi tiết</Button></SheetClose>; }
function SourceToggle({ source }: { source: AdSource }) {
  const router = useRouter(); const [pending, start] = useTransition(); const active = source.active;
  async function save(value: boolean, expected: boolean) {
    const result = await updateAdSource({ id: source.id, name: source.name, ownerUserId: source.ownerUserId, active: value,
      expectedName: source.name, expectedOwnerUserId: source.ownerUserId, expectedActive: expected, confirmOwnerChange: false });
    if (!result.ok) { toast.error(result.error); return false; }
    router.refresh(); return true;
  }
  return <div className="max-w-64"><Button variant="ghost" role="switch" aria-checked={active} aria-label={`${active ? "Tạm dừng" : "Bật"} nguồn ${source.code}`} className="min-h-11" disabled={pending || USE_MOCK || (source.code === "R" && source.active)} onClick={() => start(async () => {
    const previous = active;
    if (await save(!previous, previous)) toast.success(`Đã ${previous ? "tạm dừng" : "bật"} nguồn ${source.code}`, { duration: 8000,
      action: { label: "Hoàn tác", onClick: () => start(async () => { if (await save(previous, !previous)) toast.success(`Đã hoàn tác nguồn ${source.code}`); }) } });
  })}>{pending ? "Đang lưu…" : active ? "Tạm dừng nguồn" : "Bật nguồn"}</Button>
    <p className="text-xs text-muted-foreground">{source.code === "R" ? "Nguồn R luôn hoạt động để nhận đăng ký chung." : active ? "Tạm dừng sẽ ngừng nhận học viên thủ công; hồ sơ cũ giữ nguyên." : "Nguồn đang tạm dừng; hồ sơ cũ giữ nguyên."}</p></div>;
}
