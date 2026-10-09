import { Suspense, type ReactNode } from "react";
import { requirePermission } from "@/server/auth/session";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="content py-12">Đang kiểm tra quyền truy cập…</div>
      }
    >
      <StudentGuard>{children}</StudentGuard>
    </Suspense>
  );
}

async function StudentGuard({ children }: { children: ReactNode }) {
  await requirePermission("student-area.view");
  return children;
}
