"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
export function ViewerPagination({ total, page, size = 50, totalCapped = false, hasNext }: { total: number; page: number; size?: number; totalCapped?: boolean; hasNext?: boolean }) {
  const router = useRouter(); const params = useSearchParams(); const path = usePathname();
  const [pending, start] = useTransition();
  const pages = Math.max(1, Math.ceil(total / size));
  function go(next: number) { const p = new URLSearchParams(params); p.set("page", String(next)); start(() => router.push(`${path}?${p}`, { scroll: false })); }
  return <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Phân trang">
    <div className="min-w-0 text-sm text-muted-foreground" aria-live="polite"><p>{pending ? "Đang tải trang…" : `Đang hiển thị ${total ? (page - 1) * size + 1 : 0}–${Math.min(page * size, total)} trong tổng số ${totalCapped ? "10.000+" : total}`}</p>
      {totalCapped && <p className="mt-1 max-w-prose">Chỉ hiển thị 10.000 hoạt động mới nhất. Bạn thu hẹp bộ lọc để xem các hoạt động cũ hơn.</p>}</div>
    <div className="flex gap-2"><Button className="min-h-11" variant="outline" disabled={pending || page <= 1} onClick={() => go(page - 1)}>Trang trước</Button>
      <Button className="min-h-11" variant="outline" disabled={pending || !(hasNext ?? page < pages)} onClick={() => go(page + 1)}>Trang sau</Button></div></nav>;
}
