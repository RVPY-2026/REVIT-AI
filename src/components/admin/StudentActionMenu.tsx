"use client"

import { useState } from "react"
import Link from "next/link"
import { MessageCircle, MoreHorizontal, Phone } from "lucide-react"
import { StudentContactDialog } from "@/components/admin/StudentContactDialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { zaloChatUrl, type StudentStatus } from "@/lib/constants"

/** Zalo stays one tap away; calling and rarer actions live in the menu. */
export function StudentActionMenu({ studentId, fullName, phone, email, editable, canEditContact = false, preview = false }: {
  studentId: string
  fullName: string
  phone: string
  email: string | null
  status: StudentStatus
  editable: boolean
  canEditContact?: boolean
  preview?: boolean
}) {
  const [contactOpen, setContactOpen] = useState(false)
  return <div className="flex items-center justify-end gap-0.5">
    <Button asChild type="button" variant="ghost" size="icon-compact"><a href={zaloChatUrl(phone)} target="_blank" rel="noreferrer" aria-label={`Mở Zalo của ${fullName}`} title="Mở Zalo"><MessageCircle aria-hidden="true" strokeWidth={1.75} /></a></Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-compact" aria-label={`Thao tác khác với ${fullName}`}><MoreHorizontal aria-hidden="true" strokeWidth={1.75} /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild><a href={`tel:${phone}`}><Phone aria-hidden="true" strokeWidth={1.75} />Gọi điện</a></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={`/quan-tri/hoc-vien/${studentId}`}>Mở hồ sơ học viên</Link></DropdownMenuItem>
        {editable && <DropdownMenuItem asChild><Link href={`/quan-tri/hoc-vien/${studentId}#ghi-chu`}>Ghi chú cuộc gọi</Link></DropdownMenuItem>}
        {canEditContact && <DropdownMenuItem onSelect={() => setContactOpen(true)}>Sửa thông tin liên hệ</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    {canEditContact && contactOpen && <StudentContactDialog student={{ id: studentId, fullName, phone, email }} preview={preview} trigger={false} open={contactOpen} onOpenChange={setContactOpen} />}
  </div>
}
