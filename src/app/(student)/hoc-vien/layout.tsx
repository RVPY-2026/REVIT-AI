import { Suspense, type ReactNode } from "react";
import { requirePermission } from "@/server/auth/session";
import { StudentShell } from "@/components/layout/StudentShell";
import { ProjectBrowser, ProjectBrowserFallback } from "@/components/student/ProjectBrowser";

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
  const user = await requirePermission("student-area.view");
  const identity = { name: user.name, email: user.email, roles: user.roles };
  return (
    <StudentShell user={identity} lessonTree={<Suspense fallback={<ProjectBrowserFallback />}><ProjectBrowser /></Suspense>}>
      {children}
    </StudentShell>
  );
}
