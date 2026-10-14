import { Skeleton } from "@/components/ui/skeleton"

export default function StudentsLoading() {
  return (
    <main className="content space-y-6 py-8 sm:py-10" aria-label="Đang tải danh sách học viên">
      <div className="space-y-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="hidden space-y-2 md:block">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
      <div className="grid gap-3 md:hidden">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-52 w-full rounded-2xl" />)}</div>
    </main>
  )
}
