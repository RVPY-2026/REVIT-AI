import type { Metadata } from "next"
import { Suspense } from "react"
import { StudentImportPanel } from "@/components/admin/StudentImportPanel"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"

export const metadata: Metadata = {
  title: "Nhập dữ liệu · Quản lý RVPY",
  robots: { index: false, follow: false },
}

export default function ImportPage() {
  return <Suspense fallback={<main className="content py-8"><Skeleton className="h-48 w-full rounded-2xl" /></main>}><ImportContent /></Suspense>
}

async function ImportContent() {
  await requirePermission("students.import")
  return (
    <main className="content py-8 sm:py-10">
      <div>
        <p className="font-mono text-xs text-muted-foreground">QUẢN LÝ · DỮ LIỆU</p>
        <h1 className="mt-2 font-heading text-[28px] font-light text-foreground">Nhập dữ liệu từ Google Sheet</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">Khi khách cập nhật Sheet, tải file Excel mới lên đây. Học viên mới được thêm, người đã có không bị trùng. Bạn xem kết quả trước khi lưu.</p>
      </div>
      <div className="mt-6 max-w-3xl"><StudentImportPanel /></div>
    </main>
  )
}
