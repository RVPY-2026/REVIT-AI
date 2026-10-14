import { Skeleton } from "@/components/ui/skeleton";
export function LearningContentLoading({ embedded = false }: { embedded?: boolean } = {}) {
  const Container = embedded ? "div" : "main";
  return <Container className="content space-y-6 py-8 sm:py-10" aria-label="Đang tải nội dung học"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-9 w-56" /><Skeleton className="h-5 w-72 max-w-full" /></div><Skeleton className="h-11 w-40" /></div><Skeleton className="h-11 w-full" />{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}</Container>;
}
