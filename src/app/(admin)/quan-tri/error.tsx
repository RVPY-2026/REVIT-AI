"use client";

import { Button } from "@/components/ui/button";

export default function ManagementError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="content grid justify-items-start gap-4 py-12"><h1 className="text-[28px] font-light">Chưa thể tải khu quản lý</h1><p className="text-muted-foreground">Bạn thử tải lại. Nếu vẫn gặp lỗi, hãy liên hệ RVPY để kiểm tra kết nối.</p><Button onClick={reset}>Thử lại</Button></main>;
}
