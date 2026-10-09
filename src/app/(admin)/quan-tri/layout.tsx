import { Suspense, type ReactNode } from "react";
import { requirePermission } from "@/server/auth/session";

export default function ManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="content py-12">Đang kiểm tra quyền truy cập…</div>
      }
    >
      <ManagementGuard>{children}</ManagementGuard>
    </Suspense>
  );
}

async function ManagementGuard({ children }: { children: ReactNode }) {
  await requirePermission("admin-area.view");
  return children;
}
