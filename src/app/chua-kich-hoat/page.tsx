import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ZALO_GROUPS } from "@/lib/constants";
import { signOut } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Tài khoản chưa được kích hoạt",
  robots: { index: false, follow: false },
};

export default function InactiveAccountPage() {
  return (
    <main className="content grid min-h-dvh place-items-center py-12">
      <div className="max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-[28px] font-light">
          Tài khoản chưa được kích hoạt
        </h1>
        <p className="mt-4 text-muted-foreground">
          Gmail của bạn chưa được cấp quyền truy cập. Bạn liên hệ người tư vấn
          RVPY qua Zalo để kiểm tra và kích hoạt tài khoản nhé.
        </p>
        <Button asChild className="mt-6">
          <a
            href={ZALO_GROUPS[0].href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Liên hệ RVPY qua nhóm Zalo
          </a>
        </Button>
        <form action={signOut} className="mt-3">
          <Button variant="outline" type="submit">
            Đăng nhập bằng Gmail khác
          </Button>
        </form>
        <Button asChild variant="ghost" className="mt-3">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </main>
  );
}
