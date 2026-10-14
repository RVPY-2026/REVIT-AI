"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { studentNoteSchema, type StudentNoteInput } from "@/lib/schemas/student-note"
import { addCallNote } from "@/server/actions/student-notes"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function CallNoteForm({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<StudentNoteInput>({
    resolver: zodResolver(studentNoteSchema),
    defaultValues: { studentId, body: "" },
  })

  async function submit(values: StudentNoteInput) {
    setServerError(null)
    try {
      const result = await addCallNote(values)
      if (!result.ok) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      form.reset({ studentId, body: "" })
      toast.success("Đã lưu ghi chú cuộc gọi")
      router.refresh()
    } catch {
      const message = "Chưa thể lưu ghi chú. Bạn thử lại sau nhé."
      setServerError(message)
      toast.error(message)
      return
    }
  }

  const pending = form.formState.isSubmitting

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(submit)}>
      <div className="grid gap-2">
        <Label htmlFor="call-note">Ghi chú cuộc gọi</Label>
        <Textarea
          id="call-note"
          rows={4}
          placeholder="Nội dung trao đổi và việc cần theo dõi tiếp…"
          aria-invalid={Boolean(form.formState.errors.body)}
          aria-describedby={form.formState.errors.body ? "call-note-error" : undefined}
          {...form.register("body")}
        />
        {form.formState.errors.body && <p id="call-note-error" className="text-sm text-destructive">{form.formState.errors.body.message}</p>}
        {serverError && !form.formState.errors.body && <p className="text-sm text-destructive">{serverError}</p>}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? "Đang lưu…" : "Lưu ghi chú"}</Button>
      </div>
    </form>
  )
}
