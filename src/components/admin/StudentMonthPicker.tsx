"use client"

import { CrmSelect } from "@/components/admin/CrmSelect"

export function StudentMonthPicker({ value, onChange, disabled = false }: { value?: string; onChange: (value?: string) => void; disabled?: boolean }) {
  const current = new Date().getFullYear()
  const year = value?.slice(0,4) ?? String(current)
  const years = [...new Set([Number(year), ...Array.from({ length: 8 }, (_, i) => current - 6 + i)])].sort((a,b) => b-a)
  return <div className="flex min-w-0 flex-wrap gap-2">
    <CrmSelect label="Tháng đăng ký" value={value?.slice(5) ?? ""} disabled={disabled} options={[{ value: "", label: "Mọi tháng" }, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i+1).padStart(2,"0"), label: `Tháng ${i+1}` }))]} onChange={month => onChange(month ? `${year}-${month}` : undefined)} />
    <CrmSelect label="Năm đăng ký" value={year} disabled={disabled} options={years.map(year => ({ value: String(year), label: String(year) }))} onChange={year => onChange(`${year}-${value?.slice(5) ?? "01"}`)} />
  </div>
}
