"use client"

import { useId, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { createManualLead } from "@/server/actions/leads"
import { checkStudentPhone } from "@/server/actions/student-phone"
import { DuplicatePhoneWarning, usePhoneMatches } from "@/components/admin/DuplicatePhoneWarning"
import type { PhoneMatch } from "@/server/phone-matches"
import { normalizePhone } from "@/lib/phone"
import { manualLeadSchema, type ManualLeadInput } from "@/lib/schemas/lead"
import { USE_MOCK } from "@/lib/runtime-mode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const createStudentFormSchema = manualLeadSchema.pick({ fullName: true, phone: true, email: true, sourceId: true })
  .extend({ email: z.preprocess((value) => typeof value === "string" ? value.trim() || undefined : value, manualLeadSchema.shape.email) })
type CreateStudentForm = z.input<typeof createStudentFormSchema>
type SourceOption = { id: string; code: string; name: string; active?: boolean }

export function ManualStudentDialog({ sources, preview = false }: { sources: SourceOption[]; preview?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [confirmation, setConfirmation] = useState<{ phone: string; matches: PhoneMatch[] } | null>(null)
  const fieldPrefix = useId().replaceAll(":", "")
  const availableSources = sources.filter((source) => source.active !== false)
  const form = useForm<CreateStudentForm, unknown, z.output<typeof createStudentFormSchema>>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: { fullName: "", phone: "", email: "", sourceId: availableSources[0]?.id ?? "" },
  })
  const sourceId = useWatch({ control: form.control, name: "sourceId" })
  const phone = useWatch({ control: form.control, name: "phone" })
  const matches = usePhoneMatches(phone)
  const selectedSource = availableSources.find((source) => source.id === sourceId)
  const mockBlocked = USE_MOCK || preview

  async function submit(values: z.output<typeof createStudentFormSchema>) {
    if (pending || mockBlocked) return
    setPending(true)
    try {
      const duplicateAcknowledged = Boolean(confirmation && normalizePhone(confirmation.phone) === values.phone)
      const checked = await checkStudentPhone({ phone: values.phone })
      if (checked.length && !duplicateAcknowledged) { setConfirmation({ phone, matches: checked }); return }
      const result = await createManualLead({ ...values, duplicateAcknowledged } as ManualLeadInput)
      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0] && ["fullName", "phone", "email", "sourceId"].includes(field)) {
              form.setError(field as keyof CreateStudentForm, { message: messages[0] })
            }
          }
        }
        toast.error(result.error)
        return
      }
      toast.success(`Đã thêm học viên ${result.data.code}`)
      setOpen(false)
      form.reset()
      setConfirmation(null)
      router.push(`/quan-tri/hoc-vien/${result.data.id}`)
      router.refresh()
    } catch {
      toast.error("Chưa thể thêm học viên. Bạn thử lại sau nhé.")
    } finally {
      setPending(false)
    }
  }

  return <Dialog open={open} onOpenChange={(next) => { if (!pending) { setOpen(next); setConfirmation(null) } }}>
    <DialogTrigger asChild>
      <Button type="button" size="sm"><Plus aria-hidden="true" strokeWidth={1.75} />Thêm học viên</Button>
    </DialogTrigger>
    <DialogContent className="[&_button]:min-h-11 [&_button[aria-label]]:min-w-11 [&_input]:min-h-11">
      <DialogHeader>
        <DialogTitle>Thêm học viên</DialogTitle>
        <DialogDescription>Nhập thông tin liên hệ cơ bản và chọn nguồn đăng ký.</DialogDescription>
      </DialogHeader>
      {mockBlocked && <p role="status" className="rounded-lg border border-border bg-background-2 px-3 py-2 text-sm text-muted-foreground">Chế độ xem thử chỉ hiển thị biểu mẫu. Không thể lưu học viên mới.</p>}
      <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-name`}>Họ và tên</Label>
          <Input id={`${fieldPrefix}-name`} autoComplete="name" aria-invalid={Boolean(form.formState.errors.fullName)} aria-describedby={form.formState.errors.fullName ? `${fieldPrefix}-name-error` : undefined} {...form.register("fullName")} />
          <FieldError id={`${fieldPrefix}-name-error`} message={form.formState.errors.fullName?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-phone`}>Số điện thoại</Label>
          <Input id={`${fieldPrefix}-phone`} type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(form.formState.errors.phone)} aria-describedby={form.formState.errors.phone ? `${fieldPrefix}-phone-error` : undefined} {...form.register("phone")} />
          <FieldError id={`${fieldPrefix}-phone-error`} message={form.formState.errors.phone?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${fieldPrefix}-email`}>Email <span className="font-normal text-muted-foreground">(không bắt buộc)</span></Label>
          <Input id={`${fieldPrefix}-email`} type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? `${fieldPrefix}-email-error` : undefined} {...form.register("email")} />
          <FieldError id={`${fieldPrefix}-email-error`} message={form.formState.errors.email?.message} />
        </div>
        <DuplicatePhoneWarning matches={confirmation?.phone === phone ? confirmation.matches : matches} />
        <div className="grid gap-2">
          <Label id={`${fieldPrefix}-source-label`}>Nguồn đăng ký</Label>
          {availableSources.length ? <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between font-normal" aria-labelledby={`${fieldPrefix}-source-label`} aria-invalid={Boolean(form.formState.errors.sourceId)} aria-describedby={form.formState.errors.sourceId ? `${fieldPrefix}-source-error` : undefined}>
                {selectedSource ? `${selectedSource.code} · ${selectedSource.name}` : "Chọn nguồn"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuRadioGroup value={selectedSource?.id ?? ""} onValueChange={(sourceId) => form.setValue("sourceId", sourceId, { shouldDirty: true, shouldValidate: true })}>
                {availableSources.map((source) => <DropdownMenuRadioItem key={source.id} value={source.id}>{source.code} · {source.name}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu> : <p role="status" className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">Bạn chưa có nguồn đăng ký đang hoạt động.</p>}
          <FieldError id={`${fieldPrefix}-source-error`} message={form.formState.errors.sourceId?.message} />
        </div>
        <DialogFooter className="pt-1">
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Đóng</Button>
          <Button type="submit" disabled={pending || mockBlocked || !availableSources.length}>{pending ? "Đang lưu…" : confirmation?.phone === phone ? "Vẫn tạo hồ sơ mới" : "Tạo hồ sơ"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="text-sm text-destructive">{message}</p> : null
}
