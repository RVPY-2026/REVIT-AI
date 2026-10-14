"use client"

import { useId, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Pencil, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { STUDENT_STATUS_META, type StudentStatus } from "@/lib/constants"
import { formatPhone } from "@/lib/format"
import { USE_MOCK } from "@/lib/runtime-mode"
import type { StudentFieldName } from "@/lib/schemas/student-field"
import { updateStudentField } from "@/server/actions/student-field"
import { updateStudentStatus } from "@/server/actions/student-status"

export function InlineStudentField({ studentId, field, value, label, answerKey, editable = false, multiline = false, preview = false, className }: {
  studentId: string
  field: StudentFieldName | "status"
  value: string | number | null
  label: string
  answerKey?: string
  editable?: boolean
  multiline?: boolean
  preview?: boolean
  className?: string
}) {
  const router = useRouter()
  const fieldId = useId()
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const current = saved ?? String(value ?? "")
  const form = useForm<{ value: string }>({ defaultValues: { value: current } })
  const draft = useWatch({ control: form.control, name: "value" })
  const blocked = USE_MOCK || preview
  const display = field === "status" ? <StatusBadge status={current as StudentStatus} />
    : field === "phone" ? formatPhone(current) : current || "Chưa cập nhật"
  function cancel() {
    if (pending) return
    form.reset({ value: current })
    setEditing(false)
  }
  async function undo(from: string, to: string) {
    const result = field === "status"
      ? await updateStudentStatus({ studentId, status: to, expectedStatus: from })
      : await updateStudentField({ studentId, field, value: to, expectedValue: from, ...(answerKey ? { answerKey } : {}) })
    if (!result.ok) { toast.error(result.error); return }
    setSaved(to)
    toast.success("Đã hoàn tác")
    router.refresh()
  }
  async function save({ value: next }: { value: string }) {
    if (pending || blocked) return
    if (next === current) { cancel(); return }
    setPending(true)
    try {
      const result = field === "status"
        ? await updateStudentStatus({ studentId, status: next, expectedStatus: current })
        : await updateStudentField({ studentId, field, value: next, expectedValue: current, ...(answerKey ? { answerKey } : {}) })
      if (!result.ok) {
        form.setError("value", { message: result.fieldErrors?.value?.[0] ?? result.error })
        return
      }
      setSaved("value" in result.data ? result.data.value : next)
      setEditing(false)
      toast.success("Đã lưu thay đổi", { duration: 8000, action: { label: "Hoàn tác", onClick: () => { void undo(next, current) } } })
      router.refresh()
    } catch { form.setError("value", { message: "Chưa thể lưu. Bạn thử lại nhé." }) }
    finally { setPending(false) }
  }
  if (!editing) return <div className={`group flex min-w-0 animate-in items-center gap-1 fade-in-0 duration-150 motion-reduce:animate-none ${className ?? ""}`}>
    {editable ? <button type="button" aria-label={`Sửa ${label}`} title="Bấm để sửa" className="inline-flex min-w-0 items-center gap-1 rounded-sm text-left transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { form.reset({ value: current }); setEditing(true) }}><span className="min-w-0 whitespace-pre-wrap break-words">{display}</span><Pencil aria-hidden="true" size={14} strokeWidth={1.75} className="shrink-0 text-muted-foreground" /></button> : <span className="min-w-0 whitespace-pre-wrap break-words">{display}</span>}
  </div>
  const inputId = `inline-${fieldId}`
  return <form noValidate aria-label={`Sửa ${label}`} className={`grid min-w-0 animate-in gap-2 fade-in-0 duration-150 motion-reduce:animate-none ${className ?? ""}`} onSubmit={form.handleSubmit(save)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel() } }}>
    {field === "status" ? <DropdownMenu><DropdownMenuTrigger asChild><Button autoFocus id={inputId} aria-label={label} type="button" variant="outline" className="justify-between" disabled={pending}>{STUDENT_STATUS_META[draft as StudentStatus].label}<ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuRadioGroup value={draft} onValueChange={(next) => form.setValue("value", next)}>{Object.entries(STUDENT_STATUS_META).map(([status, meta]) => <DropdownMenuRadioItem key={status} value={status}>{meta.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
      : multiline ? <Textarea id={inputId} autoFocus aria-label={label} aria-invalid={Boolean(form.formState.errors.value)} aria-describedby={form.formState.errors.value ? `${inputId}-error` : undefined} disabled={pending} className="min-h-24" {...form.register("value")} />
      : <Input id={inputId} autoFocus aria-label={label} aria-invalid={Boolean(form.formState.errors.value)} aria-describedby={form.formState.errors.value ? `${inputId}-error` : undefined} type={field === "phone" ? "tel" : field === "email" ? "email" : "text"} inputMode={field === "birthYear" ? "numeric" : undefined} disabled={pending} {...form.register("value")} />}
    {form.formState.errors.value && <p id={`${inputId}-error`} role="alert" className="whitespace-normal text-xs text-destructive">{form.formState.errors.value.message}</p>}
    {blocked && <p className="whitespace-normal text-xs text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}
    <div className="flex flex-wrap gap-1"><Button type="submit" size="sm" disabled={pending || blocked}><Check aria-hidden="true" size={16} strokeWidth={1.75} />{pending ? "Đang lưu…" : "Lưu"}</Button><Button type="button" variant="ghost" size="sm" disabled={pending} onClick={cancel}><X aria-hidden="true" size={16} strokeWidth={1.75} />Hủy</Button></div>
  </form>
}
