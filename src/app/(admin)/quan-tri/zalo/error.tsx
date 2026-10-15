"use client";
import { Button } from "@/components/ui/button";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="content space-y-5 py-8"><ManagementPageHeader title="Chưa tải được hàng đợi Zalo" helper="Bạn kiểm tra kết nối rồi thử tải lại." /><Button onClick={reset}>Thử tải lại</Button></main>;
}
