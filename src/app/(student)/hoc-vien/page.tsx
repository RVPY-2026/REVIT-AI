import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePermission } from "@/server/auth/session";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Khu học viên",
  robots: { index: false, follow: false },
};

export default function StudentPage() {
  return (
    <Suspense
      fallback={<div className="content py-12">Đang tải tài khoản…</div>}
    >
      <StudentWelcome />
    </Suspense>
  );
}

async function StudentWelcome() {
  const user = await requirePermission("student-area.view");
  return (
    <main className="content py-12">
      <h1 className="text-[28px] font-light">Khu học viên RVPY</h1>
      <p className="mt-4">Chào {user.name}.</p>
      <p className="mt-3 text-muted-foreground">
        Khu tài liệu và tiến độ học đang được triển khai.
      </p>
      <form action={signOut} className="mt-6">
        <Button variant="outline" type="submit">
          Đăng xuất
        </Button>
      </form>
    </main>
  );
}
