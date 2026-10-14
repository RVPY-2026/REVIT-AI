"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { Button } from "@/components/ui/button"
import { STUDENT_STATUSES, STUDENT_STATUS_META } from "@/lib/constants"
import { USE_MOCK } from "@/lib/runtime-mode"
import type { ImportOutcome, ImportSummary } from "@/lib/schemas/student-import"
import { commitStudentImport, previewStudentImport } from "@/server/actions/student-import"

type Step = "pick" | "preview" | "done"

/** Upload, review, then confirm; nothing is written before the second click. */
export function StudentImportPanel() {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<Step>("pick")
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [pending, setPending] = useState(false)

  function reset() {
    setFile(null); setStep("pick"); setSummary(null); setOutcome(null); setUpdateExisting(false)
    if (input.current) input.current.value = ""
  }

  function body() {
    const data = new FormData()
    if (file) data.set("file", file)
    if (updateExisting) data.set("updateExisting", "on")
    return data
  }

  async function preview() {
    if (!file || pending) return
    setPending(true)
    try {
      const result = await previewStudentImport(body())
      if (!result.ok) { toast.error(result.error); return }
      setSummary(result.data); setStep("preview")
    } catch { toast.error("Chưa thể đọc file. Bạn thử lại nhé.") }
    finally { setPending(false) }
  }

  async function commit() {
    if (!file || pending || USE_MOCK) return
    setPending(true)
    try {
      const result = await commitStudentImport(body())
      if (!result.ok) { toast.error(result.error); return }
      setOutcome(result.data); setStep("done")
      toast.success("Đã nhập dữ liệu")
    } catch { toast.error("Chưa thể nhập dữ liệu. Chưa có thay đổi nào được lưu.") }
    finally { setPending(false) }
  }

  const nothingToDo = summary && summary.newCount === 0 && (!updateExisting || summary.withChanges === 0)

  return <div className="grid gap-5">
    <section className="rounded-2xl border border-border bg-card p-4 md:p-6" aria-label="Chọn file">
      <h2 className="flex items-center gap-2 text-[21px] font-medium"><FileSpreadsheet aria-hidden size={20} strokeWidth={1.75} />1. Chọn file Excel</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tải file .xlsx xuất từ Google Sheet &quot;THÔNG TIN HỌC VIÊN&quot;. Chỉ sheet đầu tiên (&quot;ĐĂNG KÝ KHOÁ REVIT&quot;) được đọc.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept=".xlsx" aria-label="File Excel cần nhập" disabled={pending || step === "done"}
          onChange={(event) => { setFile(event.target.files?.[0] ?? null); setSummary(null); setStep("pick") }}
          className="block min-w-0 max-w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background-2 file:px-3 file:py-2 file:text-sm file:font-medium" />
        <Button type="button" onClick={preview} disabled={!file || pending || step === "done"}><Upload aria-hidden strokeWidth={1.75} />{pending && step === "pick" ? "Đang đọc…" : "Xem trước"}</Button>
      </div>
    </section>

    {summary && step === "preview" && <section className="rounded-2xl border border-border bg-card p-4 md:p-6" aria-label="Kết quả xem trước">
      <h2 className="text-[21px] font-medium">2. Xem trước</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Học viên mới" value={summary.newCount} tone="primary" />
        <Stat label="Đã có trong hệ thống" value={summary.existingCount} />
        <Stat label="Có thay đổi" value={summary.withChanges} />
        <Stat label="Dòng lỗi" value={summary.problems.badCode.length + summary.problems.badPhone.length + summary.problems.unknownStatus.length + summary.problems.duplicateCode.length} tone={summary.problems.badPhone.length ? "warning" : undefined} />
      </dl>

      {summary.newCount > 0 && <div className="mt-5">
        <h3 className="text-sm font-medium">Sẽ thêm {summary.newCount} học viên</h3>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{STUDENT_STATUSES.filter((status) => summary.newByStatus[status]).map((status) => <span key={status}>{STUDENT_STATUS_META[status].label}: <span className="font-mono tabular-nums text-foreground">{summary.newByStatus[status]}</span></span>)}</p>
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border text-sm">
          {summary.newSample.map((row) => <li key={row.code} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span><span className="font-medium">{row.fullName}</span> <span className="font-mono text-xs text-muted-foreground">{row.code}</span></span><StatusBadge status={row.status} /></li>)}
          {summary.newCount > summary.newSample.length && <li className="px-3 py-2 text-muted-foreground">… và {summary.newCount - summary.newSample.length} học viên khác</li>}
        </ul>
      </div>}

      {summary.missingSources.length > 0 && <Notice>Nguồn {summary.missingSources.join(", ")} chưa có trong hệ thống. Hệ thống sẽ tạo nguồn mới (chưa có chủ, chỉ admin thấy lead) khi bạn xác nhận.</Notice>}

      {summary.existingCount > 0 && <div className="mt-6 rounded-xl border border-border bg-background-2/60 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={updateExisting} onChange={(event) => setUpdateExisting(event.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
          <span>
            <span className="block font-medium">Cập nhật cả học viên đã có</span>
            <span className="mt-1 block text-sm text-muted-foreground">Chỉ điền vào ô còn trống, thêm ghi chú telesale mới, và đổi trạng thái theo Sheet với người chưa ai sửa trạng thái trên web. Dữ liệu đã sửa trên web không bao giờ bị ghi đè.</span>
          </span>
        </label>
        <ul className="mt-3 grid gap-1 text-sm text-muted-foreground">
          <li>{summary.fillCount} học viên được điền thêm thông tin còn trống</li>
          <li>{summary.newNotes} ghi chú telesale mới</li>
          <li>{summary.statusFollow.count} trạng thái đổi theo Sheet</li>
          <li>{summary.statusConflict.count} trạng thái giữ nguyên vì đã sửa trên web</li>
        </ul>
        {summary.statusFollow.sample.length > 0 && <Changes title="Trạng thái sẽ đổi theo Sheet" total={summary.statusFollow.count} rows={summary.statusFollow.sample.map((row) => ({ key: row.code, name: row.fullName, code: row.code, from: row.from, to: row.to }))} />}
        {summary.statusConflict.sample.length > 0 && <Changes title="Giữ nguyên trạng thái trên web (Sheet khác)" total={summary.statusConflict.count} rows={summary.statusConflict.sample.map((row) => ({ key: row.code, name: row.fullName, code: row.code, from: row.site, to: row.sheet }))} muted />}
      </div>}

      <Problems problems={summary.problems} />

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="button" onClick={commit} disabled={pending || USE_MOCK || Boolean(nothingToDo)}>{pending ? "Đang nhập…" : "Xác nhận nhập dữ liệu"}</Button>
        <Button type="button" variant="ghost" onClick={reset} disabled={pending}>Chọn file khác</Button>
        {nothingToDo && <p className="text-sm text-muted-foreground">Không có gì mới để nhập từ file này.</p>}
        {USE_MOCK && <p className="text-sm text-muted-foreground">Chế độ xem thử không lưu dữ liệu.</p>}
      </div>
    </section>}

    {outcome && step === "done" && <section className="rounded-2xl border border-success/50 bg-card p-4 md:p-6" aria-label="Kết quả nhập">
      <h2 className="flex items-center gap-2 text-[21px] font-medium"><CheckCircle2 aria-hidden size={20} strokeWidth={1.75} className="text-success" />Đã nhập xong</h2>
      <ul className="mt-3 grid gap-1 text-sm">
        <li>Học viên mới: <span className="font-mono tabular-nums">{outcome.inserted}</span></li>
        {updateExisting && <><li>Học viên cũ được cập nhật: <span className="font-mono tabular-nums">{outcome.updated}</span> (đổi trạng thái: {outcome.statusChanged})</li><li>Ghi chú thêm: <span className="font-mono tabular-nums">{outcome.notesAdded}</span></li></>}
        {outcome.createdSources.length > 0 && <li>Nguồn mới tạo: {outcome.createdSources.join(", ")}</li>}
        {(outcome.skippedFields > 0 || outcome.skippedStatuses > 0) && <li>Giữ lại thay đổi mới trên web: {outcome.skippedFields} ô thông tin và {outcome.skippedStatuses} trạng thái.</li>}
      </ul>
      <div className="mt-4 flex flex-wrap gap-3"><Button asChild><Link href="/quan-tri/hoc-vien">Xem danh sách học viên</Link></Button><Button variant="outline" onClick={reset}>Nhập file khác</Button></div>
    </section>}
  </div>
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "primary" | "warning" }) {
  return <div className="rounded-xl border border-border p-3"><dt className="text-[13px] text-muted-foreground">{label}</dt><dd className={`mt-1 font-mono text-[24px] tabular-nums ${tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : ""}`}>{value}</dd></div>
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 flex items-start gap-2 rounded-xl border border-warning/50 p-3 text-sm"><AlertTriangle aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warning" /><span>{children}</span></p>
}

function Changes({ title, total, rows, muted = false }: { title: string; total: number; rows: { key: string; name: string; code: string; from: keyof typeof STUDENT_STATUS_META; to: keyof typeof STUDENT_STATUS_META }[]; muted?: boolean }) {
  return <div className="mt-4">
    <h3 className="text-sm font-medium">{title}</h3>
    <ul className={`mt-2 divide-y divide-border rounded-xl border border-border bg-card text-sm ${muted ? "text-muted-foreground" : ""}`}>
      {rows.map((row) => <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span>{row.name} <span className="font-mono text-xs text-muted-foreground">{row.code}</span></span><span className="flex items-center gap-2"><StatusBadge status={row.from} />→<StatusBadge status={row.to} /></span></li>)}
      {total > rows.length && <li className="px-3 py-2 text-muted-foreground">… và {total - rows.length} người khác</li>}
    </ul>
  </div>
}

function Problems({ problems }: { problems: ImportSummary["problems"] }) {
  const lines = [
    problems.badPhone.length ? `Thiếu hoặc sai số điện thoại (không nhập): dòng ${problems.badPhone.join(", ")}` : null,
    problems.badCode.length ? `Thiếu họ tên hoặc mã (không nhập): dòng ${problems.badCode.join(", ")}` : null,
    problems.unknownStatus.length ? `Trạng thái không nhận ra (không nhập): dòng ${problems.unknownStatus.join(", ")}` : null,
    problems.duplicateCode.length ? `Mã bị trùng trong file (không nhập): dòng ${problems.duplicateCode.join(", ")}` : null,
    problems.badEmail ? `${problems.badEmail} email sai định dạng, đã bỏ qua email` : null,
  ].filter(Boolean)
  if (!lines.length) return null
  return <div className="mt-5"><h3 className="text-sm font-medium">Cần xem lại trong Sheet</h3><ul className="mt-2 grid gap-1 text-sm text-muted-foreground">{lines.map((line) => <li key={line}>{line}</li>)}</ul></div>
}
