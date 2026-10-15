import { Skeleton } from "@/components/ui/skeleton";
export function ManagementLoading({ embedded = false, variant = "sources" }: { embedded?: boolean; variant?: "sources" | "audit" | "queue" }) {
  const Container = embedded ? "div" : "main";
  return <Container className="content space-y-5 py-8 sm:py-10" aria-label="Đang tải danh sách">
    <div className="flex flex-col gap-5 sm:flex-row sm:justify-between"><div className="space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-9 w-64 max-w-full" /><Skeleton className="h-10 w-96 max-w-full sm:h-5" /></div><Skeleton className="h-11 w-40" /></div>
    <Skeleton className="h-10 w-full sm:h-5" />
    {variant === "queue" && <><Skeleton className="h-24 w-full sm:h-16" /><div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></>}
    {variant !== "sources" && <Skeleton className="h-11 w-36" />}
    <div className="space-y-3">{Array.from({ length: variant === "sources" ? 4 : 5 }, (_, i) => <Skeleton key={i} className={`rounded-2xl ${variant === "sources" ? "h-96 md:h-40" : variant === "queue" ? "h-80 md:h-24" : "h-40 md:h-24"}`} />)}</div>
  </Container>;
}
