// Pure rules for the student area: what a student may open and how far along they are.
// Shared by the server queries (which enforce them) and the UI (which labels them).

export type EnrollmentKind = "trial" | "formal";
export type EnrollmentStatus = "active" | "paused" | "completed" | "cancelled";
export type ResourceAudience = "all" | "trial" | "formal";
export type LessonState = "completed" | "reported" | "overdue" | "upcoming";

/** The free trial lasts nine days from the day it starts (CLAUDE.md §5). */
export const TRIAL_DAYS = 9;
export const TRIAL_LESSON_COUNT = 3;

const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

type AccessSubject = { kind: EnrollmentKind; status: EnrollmentStatus } | null;

/** Paused or cancelled enrollments keep only the material open to everyone. */
export function hasLearningAccess(enrollment: AccessSubject): boolean {
  return enrollment !== null && (enrollment.status === "active" || enrollment.status === "completed");
}

/** Trial students open only the three trial lessons; formal students open the whole plan. */
export function canOpenLesson(enrollment: AccessSubject, trialOrder: number | null): boolean {
  if (!enrollment || !hasLearningAccess(enrollment)) return false;
  return enrollment.kind === "formal" || trialOrder !== null;
}

/** Audiences a student may read, widest first. */
export function allowedAudiences(enrollment: AccessSubject): ResourceAudience[] {
  if (!enrollment || !hasLearningAccess(enrollment)) return ["all"];
  return enrollment.kind === "formal" ? ["all", "trial", "formal"] : ["all", "trial"];
}

/** Calendar date (yyyy-MM-dd) in Asia/Ho_Chi_Minh, the zone every business date uses. */
export function businessDateString(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function lessonState(
  row: { completedAt: string | null; reportedAt: string | null; dueDate: string | null },
  now = new Date(),
): LessonState {
  if (row.completedAt) return "completed";
  if (row.reportedAt) return "reported";
  if (row.dueDate && row.dueDate < businessDateString(now)) return "overdue";
  return "upcoming";
}

/** "Bài 2", or "Bài 4/5" for the combined rows of the curriculum. */
export function lessonLabel(lessonNumbers: number[]): string {
  return lessonNumbers.length ? `Bài ${lessonNumbers.join("/")}` : "Bài";
}

/** End of the trial window: the stored expiry, otherwise nine days after it started. */
export function trialEndsAt(trialStartedAt: string | null, trialExpiresAt: string | null): string | null {
  if (trialExpiresAt) return trialExpiresAt;
  if (!trialStartedAt) return null;
  return new Date(new Date(trialStartedAt).getTime() + TRIAL_DAYS * DAY_MS).toISOString();
}

/** Whole business days left, 0 on the last day and negative once it has ended. */
export function daysUntil(isoDate: string, now = new Date()): number {
  const day = (value: Date) => Math.floor((value.getTime() + VN_OFFSET_MS) / DAY_MS);
  return day(new Date(isoDate)) - day(now);
}

export type ProgressLesson = {
  trialOrder: number | null;
  state: LessonState;
  accessible: boolean;
};

export type ProgressSummary = { total: number; completed: number; reported: number; percent: number };

/** Trial students are measured against their three lessons, formal students against the plan. */
export function summarizeProgress(lessons: ProgressLesson[], kind: EnrollmentKind | null): ProgressSummary {
  const counted = kind === "trial" ? lessons.filter((lesson) => lesson.trialOrder !== null) : lessons;
  const completed = counted.filter((lesson) => lesson.state === "completed").length;
  const reported = counted.filter((lesson) => lesson.state === "reported").length;
  return {
    total: counted.length,
    completed,
    reported,
    percent: counted.length ? Math.round((completed / counted.length) * 100) : 0,
  };
}

/** First open lesson still to do, in plan order; lessons already reported only count when nothing else is left. */
export function nextLesson<T extends ProgressLesson>(lessons: T[]): T | null {
  const open = lessons.filter((lesson) => lesson.accessible && lesson.state !== "completed");
  return open.find((lesson) => lesson.state !== "reported") ?? open[0] ?? null;
}

/** Only https links are stored and shown for a student's submitted work. */
export function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Format a stored object path as the kind of viewer the page should render. */
export type ResourceFormat = "youtube" | "pdf" | "image" | "file";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

export function resourceFormat(source: { objectPath: string | null; externalUrl: string | null }): ResourceFormat {
  if (source.externalUrl) return "youtube";
  const extension = source.objectPath?.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  return "file";
}

/** Media types the viewer route may serve inline; anything else is download-only. */
export const INLINE_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
