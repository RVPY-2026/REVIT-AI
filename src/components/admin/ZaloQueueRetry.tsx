"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { retryZaloQueue } from "@/server/actions/zalo-queue";
import { USE_MOCK } from "@/lib/runtime-mode";
export function ZaloQueueRetry({ id, name, failedCount }: { id?: string; name?: string; failedCount?: number }) {
  const [open, setOpen] = useState(false); const [pending, start] = useTransition(); const [error, setError] = useState(""); const router = useRouter();
  const title = id ? `Thử lại tin của ${name}` : "Thử lại tất cả mục lỗi";
  const submit = () => start(async () => {
    setError(""); const result = await retryZaloQueue({ id, all: !id, confirmed: true });
    if (!result.ok) { setError(result.error); toast.error(result.error); return; }
    toast.success(`Đã xếp lại ${result.data.count} tin Zalo`); setOpen(false); router.refresh();
  });
  if (id) return <Button variant="outline" className="min-h-11" disabled={pending || USE_MOCK} onClick={submit}>{pending ? "Đang xếp lại…" : "Thử lại"}</Button>;
  return <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger asChild><Button className="min-h-11 whitespace-normal" disabled={failedCount === 0}>{title}</Button></AlertDialogTrigger>
    <AlertDialogContent><AlertDialogTitle className="break-words">{title}</AlertDialogTitle><AlertDialogDescription>{id ? "Tin lỗi này sẽ được xếp lại để Zalo gửi khi đến lượt." : `Tối đa ${Math.min(failedCount ?? 50, 50)} tin lỗi cũ nhất sẽ được xếp lại. Các tin đã gửi giữ nguyên.`}</AlertDialogDescription>
      {USE_MOCK && <p className="text-sm text-muted-foreground">Chế độ xem thử chưa lưu thay đổi.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel className="min-h-11" disabled={pending}>Giữ nguyên hàng đợi</AlertDialogCancel><Button className="min-h-11" disabled={pending || USE_MOCK} onClick={submit}>{pending ? "Đang xếp lại…" : "Thử lại tin Zalo"}</Button></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>;
}
