import type { Metadata } from "next";
import { Suspense } from "react";
import { ROLE_LABELS } from "@/lib/constants";
import { requirePermission } from "@/server/auth/session";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Quản lý RVPY",
  robots: { index: false, follow: false },
};

export default function ManagementPage() {
  return (
    <Suspense
      fallback={<div className="content py-12">Đang tải tài khoản…</div>}
    >
      <ManagementWelcome />
    </Suspense>
  );
}

async function ManagementWelcome() {
  const user = await requirePermission("admin-area.view");
  return (
    <main className="content py-12">
      <h1 className="text-[28px] font-light">Quản lý RVPY</h1>
      <p className="mt-4">
        Chào {user.name}. Quyền của bạn:{" "}
        {user.roles.map((role) => ROLE_LABELS[role]).join(", ")}.
      </p>
      <p className="mt-3 text-muted-foreground">
        Các chức năng quản lý học viên đang được triển khai.
      </p>
      <form action={signOut} className="mt-6">
        <Button variant="outline" type="submit">
          Đăng xuất
        </Button>
      </form>
    </main>
  );
}
