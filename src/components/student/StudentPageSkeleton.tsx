import { Skeleton } from "@/components/ui/skeleton";

/** Loading state shared by every student page (FRONTEND_RULES §5: every data view has a skeleton). */
export function StudentPageSkeleton() {
  return (
    <main className="content grid gap-6 py-8 sm:py-10" aria-label="Đang tải">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-64 w-full rounded-[4px]" />
        <Skeleton className="h-64 w-full rounded-[4px]" />
      </div>
      <Skeleton className="h-40 w-full rounded-[4px]" />
    </main>
  );
}
