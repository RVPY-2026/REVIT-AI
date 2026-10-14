import "server-only";
import { z } from "zod";
import type { StudentOnboarding } from "@/lib/schemas/student-onboarding";
import { requirePermission } from "@/server/auth/session";
import { USE_MOCK } from "@/lib/runtime-mode";

export async function getStudentOnboarding(studentId: string): Promise<StudentOnboarding | null> {
  const user = await requirePermission("students.view");
  if (USE_MOCK) {
    const student = (await import("@/mocks/students")).mockGetStudent(user, studentId);
    if (!student) return null;
    return (await import("@/mocks/student-onboarding")).mockOnboarding(studentId, student.status);
  }
  if (!z.uuid().safeParse(studentId).success) return null;
  return (await import("@/server/queries/student-onboarding")).getStudentOnboarding(user, studentId);
}
