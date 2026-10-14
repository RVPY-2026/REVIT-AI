"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { studentNoteSchema, type StudentNoteInput } from "@/lib/schemas/student-note"
import { CONTACT_CHANNELS, CONTACT_CHANNEL_LABELS, CONTACT_OUTCOMES, CONTACT_OUTCOME_LABELS } from "@/lib/crm"
import { vietnamDateTimeInput, vietnamDateTimeInstant, businessDayStart } from "@/lib/follow-up"
import { USE_MOCK } from "@/lib/runtime-mode"
import { addCallNote } from "@/server/actions/student-notes"
import { CrmSelect } from "@/components/admin/CrmSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function CallNoteForm({ studentId, preview = false }: { studentId: string; preview?: boolean }) {
  const router = useRouter()
  const id = useId()
  const [serverError, setServerError] = useState<string | null>(null)
  const [dateTime, setDateTime] = useState("")
  const form = useForm<StudentNoteInput, unknown, z.output<typeof studentNoteSchema>>({
    resolver: zodResolver(studentNoteSchema), defaultValues: { studentId, body: "", channel: "call" },
  })
  const channel = useWatch({ control: form.control, name: "channel" }) ?? "call"
  const outcome = useWatch({ control: form.control, name: "outcome" }) ?? ""
  const pending = form.formState.isSubmitting
  const blocked = USE_MOCK || preview
  function quick(day: number, hour: number) {
    const at = new Date(businessDayStart(new Date()).getTime() + day * 86_400_000 + hour * 3_600_000)
    setDateTime(vietnamDateTimeInput(at))
  }
  async function submit(values: z.output<typeof studentNoteSchema>) {
    setServerError(null)
    try {
      const result = await addCallNote({ ...values, nextActionAt: vietnamDateTimeInstant(dateTime) })
      if (!result.ok) { setServerError(result.error); toast.error(result.error); return }
      form.reset({ studentId, body: "", channel: "call" }); setDateTime("")
      toast.success("Đã lưu ghi chú liên hệ"); router.refresh()
    } catch { setServerError("Chưa thể lưu ghi chú. Bạn thử lại sau nhé.") }
  }
  return <form className="grid min-w-0 gap-3" onSubmit={form.handleSubmit(submit)}>
    <div role="group" aria-label="Kênh liên hệ" className="flex flex-wrap gap-1">
      {CONTACT_CHANNELS.map(value => <Button key={value} type="button" size="sm" variant={channel === value ? "secondary" : "outline"} className="min-h-11" aria-pressed={channel === value} disabled={pending} onClick={() => form.setValue("channel", value)}>{CONTACT_CHANNEL_LABELS[value]}</Button>)}
    </div>
    <div className="grid gap-2"><Label htmlFor={`${id}-body`}>Nội dung liên hệ</Label><Textarea id={`${id}-body`} rows={3} placeholder="Nội dung trao đổi và việc cần theo dõi tiếp…" aria-invalid={Boolean(form.formState.errors.body)} {...form.register("body")} />
      {form.formState.errors.body && <p role="alert" className="text-sm text-destructive">{form.formState.errors.body.message}</p>}
    </div>
    <CrmSelect label="Kết quả liên hệ" value={outcome} options={[{ value: "", label: "Kết quả (không bắt buộc)" }, ...CONTACT_OUTCOMES.map(value => ({ value, label: CONTACT_OUTCOME_LABELS[value] }))]} onChange={value => form.setValue("outcome", value ? value as typeof CONTACT_OUTCOMES[number] : null)} disabled={pending} />
    <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-date`}>Hẹn liên hệ lại (giờ Việt Nam)</Label><Input id={`${id}-date`} type="datetime-local" value={dateTime} onChange={event => setDateTime(event.target.value)} className="min-w-0 w-full" />
      <div className="flex flex-wrap gap-1"><Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => quick(0,17)}>Hôm nay 17:00</Button><Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => quick(1,10)}>Ngày mai</Button><Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => quick(3,10)}>+3 ngày</Button>{dateTime && <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={() => setDateTime("")}>Bỏ hẹn</Button>}</div>
    </div>
    {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
    {blocked && <p role="status" className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu ghi chú.</p>}
    <div className="flex justify-end"><Button type="submit" disabled={pending || blocked}>{pending ? "Đang lưu…" : "Lưu ghi chú"}</Button></div>
  </form>
}
