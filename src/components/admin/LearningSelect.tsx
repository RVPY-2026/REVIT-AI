"use client";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function LearningSelect({ id, label, value, options, onChange, disabled = false }: { id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <div className="grid min-w-0 gap-2"><Label htmlFor={id}>{label}</Label><DropdownMenu><DropdownMenuTrigger asChild><Button id={id} type="button" variant="outline" disabled={disabled} className="min-h-11 w-full min-w-0 justify-between"><span className="truncate">{options.find((o) => o.value === value)?.label ?? "Chọn bài học"}</span><ChevronDown aria-hidden="true" strokeWidth={1.75} /></Button></DropdownMenuTrigger><DropdownMenuContent className="max-h-64 max-w-full shadow-none"><DropdownMenuRadioGroup value={value} onValueChange={onChange}>{options.map((o) => <DropdownMenuRadioItem key={o.value} value={o.value} className="min-h-11 whitespace-normal break-words">{o.label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu></div>;
}
