import type { StudentStatus } from "@/lib/constants";
import { CHECKLIST_FIELDS, type StudentOnboarding } from "@/lib/schemas/student-onboarding";

export function mockOnboarding(studentId: string, status: StudentStatus): StudentOnboarding {
  const enrolled = status === "trial" || status === "enrolled";
  return {
    studentId, account: null, zalo: { connected: false, failedCount: 0, pendingCount: 0, oldestPendingAt: null },
    checklist: Object.fromEntries(CHECKLIST_FIELDS.map((field) => [field, null])) as StudentOnboarding["checklist"],
    enrollment: enrolled ? { kind: status === "enrolled" ? "formal" : "trial", status: "active", trialStartedAt: "2026-10-09T00:00:00.000Z", trialEndsAt: "2026-10-18T00:00:00.000Z" } : null,
    lessons: enrolled ? [1, 2, 3].map((order) => ({ id: `mock-trial-${order}`, title: `Bài học thử ${order}`, trialOrder: order,
      reportedAt: order === 1 ? "2026-10-10T00:00:00.000Z" : null, completedAt: null, progressNote: null, submissionUrl: null })) : [],
  };
}
