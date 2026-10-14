import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function StudentNotFound() {
  return (
    <main className="content py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="font-heading text-xl font-medium">Không tìm thấy hồ sơ học viên</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hồ sơ có thể đã được chuyển hoặc bạn không có quyền xem.</p>
        <Button asChild variant="outline" className="mt-5"><Link href="/quan-tri/hoc-vien">Về danh sách học viên</Link></Button>
      </div>
    </main>
  )
}
