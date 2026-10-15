"use client"

import { useId, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { updateStudentContact } from "@/server/actions/student-contact"
import { hasActivePhoneMatch } from "@/lib/student-phone-match"
import { checkStudentPhone } from "@/server/actions/student-phone"
import { DuplicatePhoneWarning } from "@/components/admin/DuplicatePhoneWarning"
import type { PhoneMatch } from "@/server/phone-matches"
import { updateStudentContactSchema, type UpdateStudentContactInput } from "@/lib/schemas/student-contact"
import { USE_MOCK } from "@/lib/runtime-mode"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type ContactValues = Omit<UpdateStudentContactInput, "studentId">

export function StudentContactDialog({ student, preview = false, trigger = true, open: controlledOpen, onOpenChange }: {
  student: { id: string; fullName: string; phone: string; email: string | null }
  preview?: boolean
  trigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [confirmation, setConfirmation] = useState<{ phone: string; matches: PhoneMatch[] } | null>(null)
  const mockBlocked = USE_MOCK || preview
  const fieldPrefix = useId().replaceAll(":", "")
  const contactSchema = updateStudentContactSchema.omit({ studentId: true })
  const [expected, setExpected] = useState({ fullName: student.fullName, phone: student.phone, email: student.email })
  const form = useForm<ContactValues, unknown, ContactValues>({
    resolver: zodResolver(contactSchema, undefined, { raw: true }),
    defaultValues: { fullName: student.fullName, phone: student.phone, email: student.email ?? "" },
  })

  const phone = useWatch({ control: form.control, name: "phone" })

  async function submit(values: ContactValues) {
    if (pending || mockBlocked) return
    setPending(true)
    try {
      const duplicateAcknowledged = confirmation?.phone === values.phone
      if (values.phone !== expected.phone) {
        const checked = await checkStudentPhone({ phone: values.phone, excludeId: student.id })
        if (!checked.ok) { toast.error(checked.error); return }
        const matches = checked.data.matches
        if (hasActivePhoneMatch(matches) && !duplicateAcknowledged) { setConfirmation({ phone: values.phone, matches }); return }
      }
      const result = await updateStudentContact({ studentId: student.id, ...values, expected, duplicateAcknowledged })
      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0] && ["fullName", "phone", "email"].includes(field)) {
              form.setError(field as keyof ContactValues, { message: messages[0] })
            }
          }
        }
        toast.error(result.error)
        return
      }
      toast.success("Đã cập nhật thông tin liên hệ")
      setOpen(false)
      onOpenChange?.(false)
      router.refresh()
    } catch {
      toast.error("Chưa thể cập nhật thông tin. Bạn thử lại sau nhé.")
    } finally {
      setPending(false)
    }
  }

  const dialogOpen = controlledOpen ?? open
  function changeOpen(next: boolean) {
    if (pending) return
    if (next) {
      setConfirmation(null)
      setExpected({ fullName: student.fullName, phone: student.phone, email: student.email })
      form.reset({ fullName: student.fullName, phone: student.phone, email: student.email ?? "" })
    }
    if (controlledOpen === undefined) setOpen(next)
    onOpenChange?.(next)
  }

  return <Dialog open={dialogOpen} onOpenChange={changeOpen}>
    {trigger && <DialogTrigger asChild><Button type="button" variant="outline" size="compact"><Pencil aria-hidden="true" strokeWidth={1.75} />Sửa thông tin</Button></DialogTrigger>}
    <DialogContent className="[&_input]:min-h-11">
      <DialogHeader>
        <DialogTitle>Sửa thông tin liên hệ</DialogTitle>
        <DialogDescription>Cập nhật họ tên, số điện thoại và email liên hệ của học viên.</DialogDescription>
      </DialogHeader>
      {mockBlocked && <p role="status" className="rounded-lg border border-border bg-background-2 px-3 py-2 text-sm text-muted-foreground">Chế độ xem thử chỉ hiển thị biểu mẫu. Không thể lưu thay đổi học viên.</p>}
      <form className="grid gap-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <ContactField id={`${fieldPrefix}-name`} label="Họ và tên" error={form.formState.errors.fullName?.message}>
          <Input id={`${fieldPrefix}-name`} autoComplete="name" aria-invalid={Boolean(form.formState.errors.fullName)} aria-describedby={form.formState.errors.fullName ? `${fieldPrefix}-name-error` : undefined} {...form.register("fullName")} />
        </ContactField>
        <ContactField id={`${fieldPrefix}-phone`} label="Số điện thoại" error={form.formState.errors.phone?.message}>
          <Input id={`${fieldPrefix}-phone`} type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(form.formState.errors.phone)} aria-describedby={form.formState.errors.phone ? `${fieldPrefix}-phone-error` : undefined} {...form.register("phone")} />
        </ContactField>
        <ContactField id={`${fieldPrefix}-email`} label={<>Email liên hệ <span className="font-normal text-muted-foreground">(để trống để xóa)</span></>} error={form.formState.errors.email?.message}>
          <Input id={`${fieldPrefix}-email`} type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? `${fieldPrefix}-email-error` : undefined} {...form.register("email")} />
        </ContactField>
        <DuplicatePhoneWarning matches={confirmation?.phone === phone ? confirmation.matches : []} />
        <DialogFooter className="pt-1">
          <Button type="button" variant="outline" disabled={pending} onClick={() => changeOpen(false)}>Hủy</Button>
          <Button type="submit" disabled={pending || mockBlocked}>{pending ? "Đang lưu…" : confirmation?.phone === phone ? "Vẫn lưu số trùng" : "Lưu thay đổi"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function ContactField({ id, label, error, children }: { id: string; label: React.ReactNode; error?: string; children: React.ReactNode }) {
  const errorId = `${id}-error`
  return <div className="grid gap-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {error && <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>}
  </div>
}
