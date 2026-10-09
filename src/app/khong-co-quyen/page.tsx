import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Không có quyền truy cập",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <main className="content py-20">
      <h1 className="text-[28px] font-light">
        Bạn chưa có quyền truy cập trang này
      </h1>
      <p className="mt-4 text-muted-foreground">
        Bạn liên hệ quản trị RVPY nếu cần được cấp thêm quyền.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/dang-nhap">Về khu vực của bạn</Link>
      </Button>
    </main>
  );
}
