"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { checkStudentPhone } from "@/server/actions/student-phone"
import { leadSignupSchema } from "@/lib/schemas/lead"
import type { PhoneMatch } from "@/server/phone-matches"

/** Debounced hints are advisory; every save rechecks under the shared phone lock. */
export function usePhoneMatches(phone: string, excludeId?: string) {
  const [result, setResult] = useState<{ phone: string; matches: PhoneMatch[]; error?: string }>({ phone: "", matches: [] })
  useEffect(() => {
    if (!leadSignupSchema.shape.phone.safeParse(phone).success) return
    let cancelled = false
    const timer = setTimeout(() => { void checkStudentPhone({ phone, excludeId }).then(checked => {
      if (!cancelled) setResult(checked.ok ? { phone, matches: checked.data.matches } : { phone, matches: [], error: checked.error })
    }).catch(() => { if (!cancelled) setResult({ phone, matches: [], error: "Chưa thể kiểm tra số điện thoại. Bạn thử lại nhé." }) }) }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [phone, excludeId])
  return result.phone === phone ? { matches: result.matches, error: result.error } : { matches: [], error: undefined }
}

export function DuplicatePhoneWarning({ matches, error }: { matches: PhoneMatch[]; error?: string }) {
  const active = matches.filter(match => "otherSource" in match || !match.archived)
  const archived = matches.filter(match => !("otherSource" in match) && match.archived)
  if (!matches.length && !error) return null
  return <div role="status" className="grid gap-3 text-sm">
    {error && <p className="text-destructive">{error}</p>}
    {active.length > 0 && <div className="grid gap-2 rounded-xl border border-warning p-3">
    <p className="font-medium text-warning">Số này đã có hồ sơ</p>
    {active.map((match, i) => "otherSource" in match
      ? <p key={i}>Số điện thoại đã được đăng ký ở nguồn khác. Bạn kiểm tra với quản trị viên trước khi tiếp tục nhé.</p>
      : <Link key={match.id} href={`/quan-tri/hoc-vien/${match.id}`} className="flex min-h-11 items-center break-words text-primary underline">{match.code} · {match.fullName}</Link>)}
    </div>}
    {archived.length > 0 && <div className="grid gap-2 rounded-xl border border-border p-3 text-muted-foreground"><p>Số này từng có hồ sơ đã lưu trữ. Bạn vẫn có thể tạo hoặc cập nhật hồ sơ.</p>{archived.map(match => "otherSource" in match ? null : <Link key={match.id} href={`/quan-tri/hoc-vien/${match.id}`} className="flex min-h-11 items-center break-words underline">{match.code} · {match.fullName}</Link>)}</div>}
  </div>
}
