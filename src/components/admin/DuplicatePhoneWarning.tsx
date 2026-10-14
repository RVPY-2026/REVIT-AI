"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { checkStudentPhone } from "@/server/actions/student-phone"
import { leadSignupSchema } from "@/lib/schemas/lead"
import type { PhoneMatch } from "@/server/phone-matches"

/** Debounced hints are advisory; every save rechecks under the shared phone lock. */
export function usePhoneMatches(phone: string, excludeId?: string) {
  const [result, setResult] = useState<{ phone: string; matches: PhoneMatch[] }>({ phone: "", matches: [] })
  useEffect(() => {
    if (!leadSignupSchema.shape.phone.safeParse(phone).success) return
    let cancelled = false
    const timer = setTimeout(() => { void checkStudentPhone({ phone, excludeId }).then(matches => {
      if (!cancelled) setResult({ phone, matches })
    }).catch(() => { if (!cancelled) setResult({ phone, matches: [] }) }) }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [phone, excludeId])
  return result.phone === phone ? result.matches : []
}

export function DuplicatePhoneWarning({ matches }: { matches: PhoneMatch[] }) {
  if (!matches.length) return null
  return <div role="status" className="grid gap-2 rounded-xl border border-warning p-3 text-sm">
    <p className="font-medium text-warning">Số này đã có hồ sơ</p>
    {matches.map((match, i) => "otherSource" in match
      ? <p key={i}>Số điện thoại đã được đăng ký ở nguồn khác. Bạn kiểm tra với quản trị viên trước khi tiếp tục nhé.</p>
      : <Link key={match.id} href={`/quan-tri/hoc-vien/${match.id}`} className="min-h-11 break-words text-primary underline">{match.code} · {match.fullName}</Link>)}
  </div>
}
