import { Skeleton } from "@/components/ui/skeleton"

export default function TemplatesLoading() {
  return (
    <main className="content py-8 sm:py-10" aria-label="Đang tải mẫu tin nhắn">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-9 w-60" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}
      </div>
    </main>
  )
}
