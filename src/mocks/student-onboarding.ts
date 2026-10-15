import type { StudentStatus } from "@/lib/constants";
import { businessDayStart } from "@/lib/follow-up";
import { CHECKLIST_FIELDS, type StudentOnboarding } from "@/lib/schemas/student-onboarding";

export function mockOnboarding(studentId: string, status: StudentStatus): StudentOnboarding {
  const enrolled = studentId !== "mock-student-9" && (status === "trial" || status === "enrolled");
  const number = Number(studentId.replace("mock-student-", ""));
  const signedDays = ({ 2: 2, 7: 12, 9: 6, 10: 9 } as Record<number, number>)[number] ?? 0;
  const start = new Date(businessDayStart(new Date()).getTime() - signedDays * 86_400_000 + 3 * 3_600_000);
  const checklist = Object.fromEntries(CHECKLIST_FIELDS.map(field => [field, null])) as StudentOnboarding["checklist"];
  for (const field of ["group1At", "group2At", "softwareReadyAt"].slice(0, number % 4) as Array<"group1At" | "group2At" | "softwareReadyAt">)
    if (enrolled) checklist[field] = start.toISOString();
  return {
    studentId, account: null, zalo: { connected: false, failedCount: 0, pendingCount: 0, oldestPendingAt: null },
    checklist,
    enrollment: enrolled ? { kind: status === "enrolled" ? "formal" : "trial", status: "active", trialStartedAt: start.toISOString(), trialEndsAt: new Date(start.getTime() + 9 * 86_400_000).toISOString() } : null,
    lessons: enrolled ? [1, 2, 3].map((order) => ({ id: `mock-trial-${order}`, title: `Bài học thử ${order}`, trialOrder: order,
      reportedAt: order === 1 ? "2026-10-10T00:00:00.000Z" : null, completedAt: order <= number % 3 ? start.toISOString() : null, progressNote: null, submissionUrl: null })) : [],
  };
}
