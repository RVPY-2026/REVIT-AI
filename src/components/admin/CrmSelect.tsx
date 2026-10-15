"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function CrmSelect({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean
}) {
  return <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" size="compact" aria-label={label} disabled={disabled} className="min-w-0 justify-between font-normal">
    <span className="truncate">{options.find(option => option.value === value)?.label ?? label}</span><ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} />
  </Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="max-h-72 overflow-y-auto"><DropdownMenuRadioGroup value={value} onValueChange={onChange}>
    {options.map(option => <DropdownMenuRadioItem className="min-h-11" key={option.value} value={option.value}>{option.label}</DropdownMenuRadioItem>)}
  </DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
}
