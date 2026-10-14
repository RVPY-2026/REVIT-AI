"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success("Đã sao chép")
  } catch {
    const fallback = document.createElement("textarea")
    fallback.value = text
    fallback.readOnly = true
    fallback.setAttribute("aria-label", "Nội dung cần sao chép")
    fallback.className = "fixed top-0 left-0 size-px opacity-0"
    document.body.append(fallback)
    fallback.focus()
    fallback.select()
    const copied = document.execCommand("copy")
    if (copied) {
      fallback.remove()
      toast.success("Đã sao chép")
    } else {
      toast.info("Đã chọn nội dung. Bạn nhấn Ctrl+C để sao chép.", {
        onDismiss: () => fallback.remove(),
        onAutoClose: () => fallback.remove(),
      })
    }
  }
}

export function ClipboardButton({
  text,
  label = "Sao chép",
  className,
  iconOnly = false,
}: {
  text: string
  label?: string
  className?: string
  iconOnly?: boolean
}) {
  return (
    <Button type="button" variant="ghost" size={iconOnly ? "icon-sm" : "sm"} aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined} className={className} onClick={() => void copyTextToClipboard(text)}>
      <Copy aria-hidden="true" strokeWidth={1.75} />
      {!iconOnly && <span>{label}</span>}
    </Button>
  )
}
