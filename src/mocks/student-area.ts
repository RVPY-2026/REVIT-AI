import type { SessionUser } from "@/lib/auth/permissions";
import type { MyLearning, MyPlanLesson, MyReferrals, MyResource } from "@/lib/schemas/student-area";
import { businessDateString, canOpenLesson, lessonState, trialEndsAt } from "@/lib/student-learning";
import { commitmentDates } from "@/lib/study-plan";
import { FOUNDATION_LESSONS } from "@/server/db/seed/lessons";

export const MOCK_ENROLLMENT_COOKIE = "rvpy-mock-enrollment";
export type MockEnrollmentKind = "trial" | "formal";

const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const dateAgo = (days: number) => businessDateString(new Date(Date.now() - days * DAY));

/** Only the mock student account has a learning record; every other mock identity gets nothing. */
function isMockStudent(user: SessionUser) {
  return user.studentId === "mock-student-1";
}

export function mockMyLearning(user: SessionUser, kind: MockEnrollmentKind): MyLearning | null {
  if (!isMockStudent(user)) return null;
  const enrollment = {
    kind,
    status: "active" as const,
    startDate: kind === "formal" ? dateAgo(20) : null,
    trialStartedAt: kind === "trial" ? daysAgo(3) : null,
    trialEndsAt: kind === "trial" ? trialEndsAt(daysAgo(3), null) : null,
    formalStartedAt: kind === "formal" ? daysAgo(20) : null,
    agreedFeeVnd: kind === "formal" ? 3_600_000 : null,
  };
  const dates = commitmentDates(enrollment.startDate, 1, FOUNDATION_LESSONS);
  const lessons: MyPlanLesson[] = FOUNDATION_LESSONS.map((lesson, index) => {
    const dueDate = dates[index];
    // Trial: lesson 2 finished, 13 reported. Formal: the first six finished, 7/8 reported.
    const completed = kind === "formal" ? index < 6 : lesson.lessonNumbers[0] === 2;
    const reported = kind === "formal" ? index === 6 : lesson.lessonNumbers[0] === 13;
    const completedAt = completed ? daysAgo(2) : null;
    const reportedAt = reported ? daysAgo(1) : null;
    return {
      id: `mock-lesson-${index + 1}`, phase: lesson.phase, lessonNumbers: lesson.lessonNumbers, title: lesson.title,
      sortOrder: lesson.sortOrder, trialOrder: lesson.trialOrder, priority: false, dueDate,
      progressNote: reported ? "Em đã dựng xong mô hình, nhờ thầy xem giúp." : null,
      submissionUrl: reported ? "https://example.com/bai-nop" : null,
      reportedAt, completedAt, state: lessonState({ completedAt, reportedAt, dueDate }),
      accessible: canOpenLesson(enrollment, lesson.trialOrder),
    };
  });
  return {
    student: {
      id: "mock-student-1", code: "A2610001", fullName: "Học viên mẫu", status: kind === "formal" ? "enrolled" : "trial",
      group1At: daysAgo(2), group2At: null, softwareReadyAt: kind === "formal" ? daysAgo(10) : null, officialZaloAt: null,
    },
    enrollment,
    lessons,
    licenses: kind === "formal"
      ? [{ id: "mock-license-1", product: "suite", status: "active", startsAt: daysAgo(10), expiresAt: new Date(Date.now() + 60 * DAY).toISOString() }]
      : [],
  };
}

const YOUTUBE = "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ";
const resources: (MyResource & { audience: "all" | "trial" | "formal" })[] = [
  { id: "mock-resource-1", title: "Giới thiệu giao diện Revit", lessonId: null, lessonTitle: null, mode: "view", format: "youtube", embedUrl: YOUTUBE, audience: "all" },
  { id: "mock-resource-2", title: "Tài liệu CAD trong Revit", lessonId: "t2", lessonTitle: "CAD trong Revit", mode: "view", format: "pdf", embedUrl: null, audience: "trial" },
  { id: "mock-resource-3", title: "View Template: bài giảng", lessonId: "t13", lessonTitle: "View Template", mode: "view", format: "youtube", embedUrl: YOUTUBE, audience: "trial" },
  { id: "mock-resource-4", title: "Bộ cài Auto Join cho Revit 2025", lessonId: null, lessonTitle: null, mode: "download", format: "file", embedUrl: null, audience: "formal" },
];

export function mockMyResources(user: SessionUser, kind: MockEnrollmentKind): MyResource[] {
  if (!isMockStudent(user)) return [];
  return resources
    .filter((item) => kind === "formal" || item.audience !== "formal")
    .map(({ audience, ...item }) => { void audience; return item; });
}

/** Mock lesson resources are matched by lesson title so they follow the seed curriculum. */
export function mockLessonResources(user: SessionUser, kind: MockEnrollmentKind, lessonTitle: string): MyResource[] {
  return mockMyResources(user, kind).filter((item) => item.lessonTitle === lessonTitle);
}

export function mockMyReferrals(user: SessionUser): MyReferrals | null {
  return isMockStudent(user) ? { code: "A2610001", invited: 3, enrolled: 0 } : null;
}
