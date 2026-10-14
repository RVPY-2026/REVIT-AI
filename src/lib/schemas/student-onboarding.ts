import { z } from "zod";

export const CHECKLIST_FIELDS = ["zaloFriendAt", "group1At", "group2At", "feeSentAt", "softwareReadyAt", "officialZaloAt"] as const;
export const CHECKLIST_LABELS: Record<typeof CHECKLIST_FIELDS[number], string> = {
  zaloFriendAt: "Đã liên hệ / kết bạn Zalo", group1At: "Đã vào nhóm Zalo 1", group2At: "Đã vào nhóm Zalo 2",
  feeSentAt: "Đã gửi thông tin học phí", softwareReadyAt: "Đã cài phần mềm", officialZaloAt: "Đã thêm Zalo chính thức",
};
const timestamp = z.iso.datetime().nullable();
export const activateStudentSchema = z.object({
  studentId: z.uuid(), loginEmail: z.string().trim().toLowerCase().max(254).pipe(z.email()),
}).strict();
export const checklistSchema = z.object({
  studentId: z.uuid(), field: z.enum(CHECKLIST_FIELDS), done: z.boolean(), expectedAt: timestamp,
}).strict();
export const confirmTrialLessonSchema = z.object({
  studentId: z.uuid(), planLessonId: z.uuid(), completed: z.boolean(),
  expectedCompletedAt: timestamp, expectedReportedAt: timestamp,
}).strict();
export const retryZaloMessagesSchema = z.object({ studentId: z.uuid() }).strict();

export type StudentOnboarding = {
  studentId: string;
  zalo: { connected: boolean; failedCount: number; pendingCount: number; oldestPendingAt: string | null };
  account: { email: string; active: boolean } | null;
  checklist: Record<typeof CHECKLIST_FIELDS[number], string | null>;
  enrollment: { kind: "trial" | "formal"; status: "active" | "paused" | "cancelled" | "completed"; trialStartedAt: string | null; trialEndsAt: string | null } | null;
  lessons: { id: string; title: string; trialOrder: number; reportedAt: string | null; completedAt: string | null; progressNote: string | null; submissionUrl: string | null }[];
};
