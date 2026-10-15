import "server-only";
import { studentIdSchema } from "@/lib/schemas/student";
import { studentDeletionStateBlockers, type StudentDeletionCheck } from "@/lib/student-deletion";
import { requirePermission, USE_MOCK } from "@/server/auth/session";

export async function getStudentDeletionCheck(id: string): Promise<StudentDeletionCheck> {
  const user = await requirePermission("students.delete");
  if (!studentIdSchema.safeParse(id).success) return { blockers: ["Hồ sơ chưa hợp lệ."] };
  if (USE_MOCK) {
    const row = (await import("@/mocks/students")).mockGetStudent(user, id);
    if (!row) return { blockers: ["Không tìm thấy học viên."] };
    return { blockers: studentDeletionStateBlockers({ archivedAt: row.archivedAt ? new Date(row.archivedAt) : null, userId: null }) };
  }
  return (await import("@/server/queries/student-deletion")).getStudentDeletionCheck(user, id);
}
