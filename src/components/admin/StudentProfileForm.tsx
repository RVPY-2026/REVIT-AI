"use client"

import { useEffect, useId, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Check, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { ClipboardButton } from "@/components/admin/ClipboardButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatPhone } from "@/lib/format"
import { USE_MOCK } from "@/lib/runtime-mode"
import { studentChangeKey, type StudentFieldName } from "@/lib/schemas/student-field"
import { updateStudentProfile } from "@/server/actions/student-field"

export type ProfileFieldSpec = {
  field: StudentFieldName
  /** Only needed for read-only rows, which share a field name with an editable one. */
  key?: string
  answerKey?: string
  label: string
  value: string
  /** Shown as plain text, e.g. the student code. */
  readOnly?: boolean
  multiline?: boolean
  mono?: boolean
}

const keyOf = (spec: ProfileFieldSpec) => spec.key ?? studentChangeKey(spec)

/**
 * Every field is an input from the start; one bar at the bottom saves or discards all edits together,
 * so nobody has to open, confirm and close each cell separately.
 */
export function StudentProfileForm({ studentId, fields, answers, editable, preview = false }: {
  studentId: string
  fields: ProfileFieldSpec[]
  answers: ProfileFieldSpec[]
  editable: boolean
  preview?: boolean
}) {
  const router = useRouter()
  const formId = useId()
  const all = [...fields, ...answers]
  const toValues = (specs: ProfileFieldSpec[]) => Object.fromEntries(specs.map((spec) => [keyOf(spec), spec.value]))
  const [saved, setSaved] = useState<Record<string, string>>(() => toValues(all))
  const [values, setValues] = useState<Record<string, string>>(() => toValues(all))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const blocked = USE_MOCK || preview
  const editableSpecs = all.filter((spec) => !spec.readOnly)
  const dirty = editableSpecs.filter((spec) => values[keyOf(spec)] !== saved[keyOf(spec)])

  useEffect(() => {
    if (!dirty.length) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty.length])

  function toChanges(specs: ProfileFieldSpec[], from: Record<string, string>, to: Record<string, string>) {
    return specs.map((spec) => ({ field: spec.field, answerKey: spec.answerKey, value: to[keyOf(spec)], expectedValue: from[keyOf(spec)] }))
  }

  async function undo(specs: ProfileFieldSpec[], previous: Record<string, string>, current: Record<string, string>) {
    const result = await updateStudentProfile({ studentId, changes: toChanges(specs, current, previous) })
    if (!result.ok) { toast.error(result.error); return }
    setSaved((state) => ({ ...state, ...result.data.values }))
    setValues((state) => ({ ...state, ...result.data.values }))
    toast.success("Đã hoàn tác")
    router.refresh()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending || blocked || !dirty.length) return
    setPending(true)
    setErrors({})
    const before = Object.fromEntries(dirty.map((spec) => [keyOf(spec), saved[keyOf(spec)]]))
    try {
      const result = await updateStudentProfile({ studentId, changes: toChanges(dirty, saved, values) })
      if (!result.ok) {
        if (result.fieldErrors) setErrors(Object.fromEntries(Object.entries(result.fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? "Giá trị chưa hợp lệ."])))
        toast.error(result.error)
        return
      }
      const now = { ...saved, ...result.data.values }
      setSaved(now)
      setValues((state) => ({ ...state, ...result.data.values }))
      const specs = dirty
      toast.success(`Đã lưu ${specs.length} thay đổi`, { duration: 8000, action: { label: "Hoàn tác", onClick: () => { void undo(specs, before, now) } } })
      router.refresh()
    } catch { toast.error("Chưa thể lưu. Bạn thử lại nhé.") }
    finally { setPending(false) }
  }

  function discard() {
    setValues(saved)
    setErrors({})
  }

  const renderField = (spec: ProfileFieldSpec) => {
    const key = keyOf(spec)
    const id = `${formId}-${key}`
    const error = errors[key]
    const value = values[key]
    const read = !editable || spec.readOnly
    const mono = spec.mono || spec.field === "phone"
    return <div key={key} className="grid min-w-0 gap-1.5 text-sm sm:grid-cols-[minmax(100px,0.7fr)_minmax(0,1fr)] sm:gap-3">
      <label htmlFor={id} className="pt-2 text-muted-foreground">{spec.label}</label>
      <div className="min-w-0">
        {read ? <div className={`flex min-h-10 items-center gap-1 break-words ${mono ? "font-mono text-[13px]" : ""}`}>
          <span className="whitespace-pre-wrap">{(spec.field === "phone" ? formatPhone(value) : value) || "Chưa cập nhật"}</span>
          {spec.field === "phone" && value && <ClipboardButton text={value} label="Sao chép số điện thoại" iconOnly />}
        </div>
          : <>
            {spec.multiline
              ? <Textarea id={id} value={value} disabled={pending} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => setValues((state) => ({ ...state, [key]: event.target.value }))} className="min-h-24" />
              : <Input id={id} value={value} disabled={pending} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                type={spec.field === "phone" ? "tel" : spec.field === "email" ? "email" : "text"} inputMode={spec.field === "birthYear" ? "numeric" : undefined}
                className={`${mono ? "font-mono text-[13px]" : ""} ${value !== saved[key] ? "border-primary" : ""}`}
                onChange={(event) => setValues((state) => ({ ...state, [key]: event.target.value }))} />}
            {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
          </>}
      </div>
    </div>
  }

  return <form noValidate onSubmit={submit} aria-label="Thông tin đăng ký">
    <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">{fields.map(renderField)}</div>
    {answers.length > 0 && <div className="mt-5 border-t border-border pt-4">
      <h2 className="text-sm font-medium">Câu trả lời trong form</h2>
      <div className="mt-3 grid gap-3">{answers.map(renderField)}</div>
    </div>}
    {editable && dirty.length > 0 && <div role="region" aria-label="Lưu thay đổi hồ sơ" className="sticky bottom-20 z-20 mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-primary bg-popover p-3 shadow-lg md:bottom-4">
      <p className="mr-auto text-sm"><span className="font-mono tabular-nums">{dirty.length}</span> thay đổi chưa lưu{blocked && <span className="text-muted-foreground"> · chế độ xem thử không lưu</span>}</p>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={discard}><RotateCcw aria-hidden="true" strokeWidth={1.75} />Hủy thay đổi</Button>
      <Button type="submit" size="sm" disabled={pending || blocked}><Check aria-hidden="true" strokeWidth={1.75} />{pending ? "Đang lưu…" : "Lưu thay đổi"}</Button>
    </div>}
  </form>
}
