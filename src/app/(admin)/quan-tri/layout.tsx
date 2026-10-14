import { Suspense, type ReactNode } from "react";
import { requirePermission } from "@/server/auth/session";
import { ManagementShell } from "@/components/layout/ManagementShell";

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
  const user = await requirePermission("admin-area.view");
  const identity = { name: user.name, email: user.email, roles: user.roles };
  return (
    <ManagementShell user={identity}>{children}</ManagementShell>
  );
}
