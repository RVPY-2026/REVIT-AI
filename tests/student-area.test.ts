import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SessionUser } from "../src/lib/auth/permissions";
import { feedbackSchema, planLessonIdSchema, reportLessonSchema, resourceIdSchema } from "../src/lib/schemas/student-area";
import {
  allowedAudiences, businessDateString, canOpenLesson, daysUntil, hasLearningAccess, isSafeHttpsUrl,
  lessonLabel, lessonState, nextLesson, resourceFormat, summarizeProgress, trialEndsAt,
} from "../src/lib/student-learning";
import { studentScope } from "../src/server/auth/scope";
import { mockMyLearning, mockMyReferrals, mockMyResources } from "../src/mocks/student-area";

const trial = { kind: "trial", status: "active" } as const;
const formal = { kind: "formal", status: "active" } as const;
const mockStudent: SessionUser = {
  id: "mock-student", email: "s@example.com", name: "S", avatarUrl: null,
  roles: ["student"], sourceIds: [], studentId: "mock-student-1",
};

test("a trial student opens only trial lessons; a formal student opens the plan", () => {
  assert.equal(canOpenLesson(trial, 2), true);
  assert.equal(canOpenLesson(trial, null), false);
  assert.equal(canOpenLesson(formal, null), true);
  assert.equal(canOpenLesson(null, 1), false);
});

test("paused and cancelled enrollments lose lessons and non-public resources", () => {
  for (const status of ["paused", "cancelled"] as const) {
    assert.equal(hasLearningAccess({ kind: "formal", status }), false);
    assert.equal(canOpenLesson({ kind: "formal", status }, 1), false);
    assert.deepEqual(allowedAudiences({ kind: "formal", status }), ["all"]);
  }
  assert.equal(hasLearningAccess({ kind: "formal", status: "completed" }), true);
});

test("resource audiences widen from no enrollment to trial to formal", () => {
  assert.deepEqual(allowedAudiences(null), ["all"]);
  assert.deepEqual(allowedAudiences(trial), ["all", "trial"]);
  assert.deepEqual(allowedAudiences(formal), ["all", "trial", "formal"]);
});

test("lesson state: confirmed beats reported beats overdue, and the due date is a Vietnam calendar day", () => {
  const now = new Date("2026-10-09T10:00:00Z");
  assert.equal(lessonState({ completedAt: "x", reportedAt: "y", dueDate: "2026-01-01" }, now), "completed");
  assert.equal(lessonState({ completedAt: null, reportedAt: "y", dueDate: "2026-01-01" }, now), "reported");
  assert.equal(lessonState({ completedAt: null, reportedAt: null, dueDate: "2026-10-08" }, now), "overdue");
  assert.equal(lessonState({ completedAt: null, reportedAt: null, dueDate: "2026-10-09" }, now), "upcoming");
  assert.equal(lessonState({ completedAt: null, reportedAt: null, dueDate: null }, now), "upcoming");
  // 18:00 UTC on the 9th is already the 10th in Vietnam.
  assert.equal(businessDateString(new Date("2026-10-09T18:00:00Z")), "2026-10-10");
  assert.equal(lessonState({ completedAt: null, reportedAt: null, dueDate: "2026-10-09" }, new Date("2026-10-09T18:00:00Z")), "overdue");
});

test("combined curriculum rows are labelled with every lesson number", () => {
  assert.equal(lessonLabel([2]), "Bài 2");
  assert.equal(lessonLabel([4, 5]), "Bài 4/5");
});

test("the trial lasts nine days unless an expiry is stored", () => {
  assert.equal(trialEndsAt("2026-10-01T00:00:00.000Z", null), "2026-10-10T00:00:00.000Z");
  assert.equal(trialEndsAt("2026-10-01T00:00:00.000Z", "2026-10-05T00:00:00.000Z"), "2026-10-05T00:00:00.000Z");
  assert.equal(trialEndsAt(null, null), null);
  const now = new Date("2026-10-09T03:00:00Z");
  assert.equal(daysUntil("2026-10-09T12:00:00Z", now), 0);
  assert.equal(daysUntil("2026-10-12T12:00:00Z", now), 3);
  assert.equal(daysUntil("2026-10-08T12:00:00Z", now), -1);
});

test("trial progress counts the three trial lessons, formal progress the whole plan", () => {
  const lessons = [
    { trialOrder: 1, state: "completed", accessible: true },
    { trialOrder: 2, state: "reported", accessible: true },
    { trialOrder: 3, state: "upcoming", accessible: true },
    { trialOrder: null, state: "completed", accessible: false },
  ] as const;
  assert.deepEqual(summarizeProgress([...lessons], "trial"), { total: 3, completed: 1, reported: 1, percent: 33 });
  assert.deepEqual(summarizeProgress([...lessons], "formal"), { total: 4, completed: 2, reported: 1, percent: 50 });
  assert.deepEqual(summarizeProgress([], null), { total: 0, completed: 0, reported: 0, percent: 0 });
  assert.equal(nextLesson([...lessons])?.trialOrder, 3, "a reported lesson is skipped while others remain");
  assert.equal(nextLesson([lessons[0], lessons[1]])?.trialOrder, 2, "a reported lesson is the fallback");
  assert.equal(nextLesson([{ trialOrder: null, state: "upcoming", accessible: false }]), null);
});

test("only https links without credentials are accepted for submitted work", () => {
  assert.equal(isSafeHttpsUrl("https://drive.google.com/file/d/abc"), true);
  for (const bad of ["http://example.com", "javascript:alert(1)", "data:text/html,x", "https://user:pw@example.com", "not a url", "//example.com"]) {
    assert.equal(isSafeHttpsUrl(bad), false, bad);
  }
});

test("lesson reports validate input and drop blank optional fields", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const blank = reportLessonSchema.parse({ planLessonId: id, note: "  ", submissionUrl: "" });
  assert.equal(blank.note, undefined);
  assert.equal(blank.submissionUrl, undefined);
  assert.equal(reportLessonSchema.parse({ planLessonId: id, note: " xong " }).note, "xong");
  assert.equal(reportLessonSchema.safeParse({ planLessonId: id, submissionUrl: "http://x.com" }).success, false);
  assert.equal(reportLessonSchema.safeParse({ planLessonId: id, submissionUrl: "javascript:alert(1)" }).success, false);
  assert.equal(reportLessonSchema.safeParse({ planLessonId: id, note: "x".repeat(501) }).success, false);
  assert.equal(reportLessonSchema.safeParse({ planLessonId: "../etc", }).success, false);
  assert.equal(reportLessonSchema.safeParse({ planLessonId: id, studentId: "someone-else" }).success, false);
});

test("feedback needs a kind, a real message and a 1-10 score", () => {
  assert.equal(feedbackSchema.safeParse({ kind: "course", body: "Bài giảng rất dễ hiểu" }).success, true);
  assert.equal(feedbackSchema.safeParse({ kind: "addin", body: "Lỗi khi mở thẻ RVPY", score: "7" }).success, true);
  assert.equal(feedbackSchema.safeParse({ kind: "other", body: "Bài giảng rất dễ hiểu" }).success, false);
  assert.equal(feedbackSchema.safeParse({ kind: "course", body: "ngắn" }).success, false);
  assert.equal(feedbackSchema.safeParse({ kind: "course", body: "Bài giảng rất dễ hiểu", score: 11 }).success, false);
  assert.equal(feedbackSchema.safeParse({ kind: "course", body: "Bài giảng rất dễ hiểu", studentId: "x" }).success, false);
});

test("route ids accept uuids and mock ids only", () => {
  assert.equal(planLessonIdSchema.safeParse("mock-lesson-3").success, true);
  assert.equal(resourceIdSchema.safeParse("mock-resource-1").success, true);
  assert.equal(resourceIdSchema.safeParse("1; drop table").success, false);
  assert.equal(planLessonIdSchema.safeParse("mock-resource-1").success, false);
});

test("viewer format comes from the stored path, never from user input", () => {
  assert.equal(resourceFormat({ objectPath: "docs/cad.PDF", externalUrl: null }), "pdf");
  assert.equal(resourceFormat({ objectPath: "img/a.webp", externalUrl: null }), "image");
  assert.equal(resourceFormat({ objectPath: "x/page.html", externalUrl: null }), "file");
  assert.equal(resourceFormat({ objectPath: null, externalUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ" }), "youtube");
});

test("the student area scope pins every query to the one linked student", () => {
  const dialect = new PgDialect({ casing: "snake_case" });
  const query = dialect.sqlToQuery(studentScope(mockStudent, "student"));
  assert.deepEqual(query.params, ["mock-student-1"]);
  // A staff account without a linked student sees nothing, and a sale source never widens it.
  const sale: SessionUser = { ...mockStudent, roles: ["sale"], sourceIds: ["source-a"], studentId: null };
  assert.equal(dialect.sqlToQuery(studentScope(sale, "student")).sql, "false");
  const admin: SessionUser = { ...mockStudent, roles: ["admin"], studentId: null };
  assert.equal(dialect.sqlToQuery(studentScope(admin, "student")).sql, "false");
});

test("mock learning data exists only for the mock student and respects trial access", () => {
  const admin: SessionUser = { ...mockStudent, roles: ["admin"], studentId: null };
  assert.equal(mockMyLearning(admin, "trial"), null);
  assert.equal(mockMyReferrals(admin), null);
  assert.deepEqual(mockMyResources(admin, "formal"), []);

  const trialPlan = mockMyLearning(mockStudent, "trial")!;
  assert.equal(trialPlan.lessons.length, 22);
  assert.deepEqual(trialPlan.lessons.filter((lesson) => lesson.accessible).map((lesson) => lesson.trialOrder).sort(), [1, 2, 3]);
  assert.ok(trialPlan.lessons.every((lesson) => lesson.dueDate === null));
  assert.equal(mockMyResources(mockStudent, "trial").some((item) => item.mode === "download"), false);

  const formalPlan = mockMyLearning(mockStudent, "formal")!;
  assert.ok(formalPlan.lessons.every((lesson) => lesson.accessible));
  assert.ok(formalPlan.lessons.some((lesson) => lesson.state === "completed"));
  assert.ok(formalPlan.lessons.some((lesson) => lesson.state === "reported"));
  assert.ok(formalPlan.lessons.every((lesson) => lesson.dueDate !== null));
  assert.equal(mockMyResources(mockStudent, "formal").some((item) => item.mode === "download"), true);
});
