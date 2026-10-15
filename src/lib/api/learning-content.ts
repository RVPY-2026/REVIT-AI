import "server-only";
import { z } from "zod";
import { requirePermission } from "@/server/auth/session";
import { USE_MOCK } from "@/lib/runtime-mode";

export async function getLearningContent(domain: "resources" | "lessons") {
  const user = await requirePermission(domain === "resources" ? "resources.manage" : "lessons.manage");
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const mock = await import("@/mocks/learning-content");
    return { lessons: mock.mockManagedLessons, resources: domain === "resources" ? mock.mockManagedResources : [] };
  }
  const queries = await import("@/server/queries/learning-content");
  const [lessons, resources] = await Promise.all([queries.listManagedLessons(user), domain === "resources" ? queries.listManagedResources(user) : Promise.resolve([])]);
  return { lessons, resources };
}
export async function getLearningProgress(studentId: string) {
  const user = await requirePermission("students.view");
  if (USE_MOCK) {
    const student = (await import("@/mocks/students")).mockGetStudent(user, studentId);
    return student ? (await import("@/mocks/learning-content")).mockLearningProgress(studentId, student.status === "enrolled" ? "formal" : student.status === "trial" ? "trial" : null) : null;
  }
  if (!z.uuid().safeParse(studentId).success) return null;
  return (await import("@/server/queries/learning-content")).getManagedLearningProgress(user, studentId);
}
