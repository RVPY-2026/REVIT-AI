import type { Metadata } from "next"
import { Suspense } from "react"
import { MessageSquareText } from "lucide-react"
import { ClipboardButton } from "@/components/admin/ClipboardButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { listMessageTemplates } from "@/lib/api/templates"
import { STUDENT_STATUS_META } from "@/lib/constants"
import { requirePermission } from "@/server/auth/session"

export const metadata: Metadata = {
  title: "Mẫu tin nhắn · Quản lý RVPY",
  robots: { index: false, follow: false },
}

export default function MessageTemplatesPage() {
  return <Suspense fallback={<TemplatesLoading />}><TemplatesContent /></Suspense>
}

async function TemplatesContent() {
  await requirePermission("templates.view")
  const templates = await listMessageTemplates()

  return (
    <main className="content py-8 sm:py-10">
      <div>
        <p className="font-mono text-xs text-muted-foreground">QUẢN LÝ · HỖ TRỢ TƯ VẤN</p>
        <h1 className="mt-2 font-heading text-[28px] font-light text-foreground">Mẫu tin nhắn</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">Sao chép mẫu và gửi thủ công qua Zalo sau khi bạn kiểm tra nội dung.</p>
      </div>

      {templates.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-2">
                    <CardTitle className="flex items-center gap-2"><MessageSquareText aria-hidden="true" size={18} strokeWidth={1.75} />{template.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{template.forStatus ? `Dùng khi: ${STUDENT_STATUS_META[template.forStatus].label}` : "Dùng ở nhiều trạng thái"}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-background-2/60 p-3.5 font-sans text-sm leading-relaxed text-foreground">{template.body}</pre>
                <div><ClipboardButton text={template.body} label="Sao chép mẫu" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <MessageSquareText aria-hidden="true" className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <h2 className="mt-4 font-heading text-lg font-medium">Chưa có mẫu tin nhắn</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Các mẫu tư vấn sẽ xuất hiện tại đây khi được thêm vào hệ thống.</p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}

function TemplatesLoading() {
  return <main className="content py-8" aria-label="Đang tải mẫu tin nhắn"><Skeleton className="h-3 w-40" /><Skeleton className="mt-3 h-9 w-60" /><Skeleton className="mt-2 h-4 w-96 max-w-full" /><div className="mt-6 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}</div></main>
}
