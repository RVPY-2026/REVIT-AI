import { z } from "zod";
import type { StudentStatus } from "@/lib/constants";
import {
  isSafeHttpsUrl,
  type EnrollmentKind,
  type EnrollmentStatus,
  type LessonState,
  type ResourceFormat,
} from "@/lib/student-learning";

const mockPlanLessonIdSchema = z.string().regex(/^mock-lesson-[1-9][0-9]*$/);
const mockResourceIdSchema = z.string().regex(/^mock-resource-[1-9][0-9]*$/);
export const planLessonIdSchema = z.union([z.uuid(), mockPlanLessonIdSchema]);
export const resourceIdSchema = z.union([z.uuid(), mockResourceIdSchema]);

/** A student reports a lesson as done; staff confirm it later. Withdrawing is allowed until then. */
export const reportLessonSchema = z.object({
  planLessonId: planLessonIdSchema,
  withdraw: z.boolean().optional(),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional().transform((value) => value || undefined),
  submissionUrl: z
    .string().trim().max(500, "Liên kết tối đa 500 ký tự").optional()
    .transform((value) => value || undefined)
    .refine((value) => value === undefined || isSafeHttpsUrl(value), "Liên kết cần bắt đầu bằng https://"),
}).strict();
export type ReportLessonInput = z.input<typeof reportLessonSchema>;

export const FEEDBACK_KINDS = ["course", "addin"] as const;
export const FEEDBACK_KIND_LABELS = { course: "Khoá học", addin: "Add-in Revit" } as const;
export const FEEDBACK_DAILY_LIMIT = 5;

export const feedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  body: z.string().trim().min(10, "Nội dung cần ít nhất 10 ký tự").max(2000, "Nội dung tối đa 2000 ký tự"),
  score: z.coerce.number().int().min(1, "Điểm từ 1 đến 10").max(10, "Điểm từ 1 đến 10").optional(),
}).strict();
export type FeedbackInput = z.input<typeof feedbackSchema>;
export type FeedbackData = z.output<typeof feedbackSchema>;

// --- Shapes returned to the pages. Only the caller's own data, only the columns a screen needs. ---

export type MyStudent = {
  id: string;
  code: string;
  fullName: string;
  status: StudentStatus;
  group1At: string | null;
  group2At: string | null;
  softwareReadyAt: string | null;
  officialZaloAt: string | null;
};

export type MyEnrollment = {
  kind: EnrollmentKind;
  status: EnrollmentStatus;
  startDate: string | null;
  trialStartedAt: string | null;
  /** Stored expiry, or nine days after the trial started. */
  trialEndsAt: string | null;
  formalStartedAt: string | null;
  agreedFeeVnd: number | null;
};

export type MyPlanLesson = {
  id: string;
  phase: "foundation" | "specialist";
  lessonNumbers: number[];
  title: string;
  sortOrder: number;
  trialOrder: number | null;
  priority: boolean;
  dueDate: string | null;
  progressNote: string | null;
  submissionUrl: string | null;
  reportedAt: string | null;
  completedAt: string | null;
  state: LessonState;
  accessible: boolean;
};

export type MyLicense = {
  id: string;
  product: string;
  status: "active" | "expired" | "revoked";
  startsAt: string;
  expiresAt: string | null;
};

export type MyLearning = {
  student: MyStudent;
  enrollment: MyEnrollment | null;
  lessons: MyPlanLesson[];
  licenses: MyLicense[];
};

export type MyResource = {
  id: string;
  title: string;
  lessonId: string | null;
  lessonTitle: string | null;
  mode: "view" | "download";
  format: ResourceFormat;
  /** YouTube embed address; storage files are served by /api/student/resources/<id>. */
  embedUrl: string | null;
};

export type MyReferrals = {
  code: string;
  invited: number;
  enrolled: number;
};
