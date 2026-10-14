"use client"

import { Button } from "@/components/ui/button"

export default function StudentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="content py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="font-heading text-xl font-medium">Chưa tải được danh sách học viên</h1>
        <p className="mt-2 text-sm text-muted-foreground">Kiểm tra kết nối rồi thử tải lại trang.</p>
        <Button type="button" className="mt-5" onClick={reset}>Thử tải lại</Button>
      </div>
    </main>
  )
}
