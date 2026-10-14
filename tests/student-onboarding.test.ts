import assert from "node:assert/strict";
import test from "node:test";
import { can } from "../src/lib/auth/permissions";
import { activateStudentSchema, checklistSchema, confirmTrialLessonSchema } from "../src/lib/schemas/student-onboarding";

const studentId = "00000000-0000-4000-8000-000000000001";
test("account activation is admin-only; trial management is available to scoped sales", () => {
  for (const role of ["admin", "sale", "student", "user"] as const) {
    assert.equal(can({ roles: [role] }, "students.activate"), role === "admin");
    assert.equal(can({ roles: [role] }, "students.learning.edit"), role === "admin" || role === "sale");
  }
});
test("onboarding accepts only validated identities, checklist keys and concurrency snapshots", () => {
  assert.equal(activateStudentSchema.parse({ studentId, loginEmail: "  Learner@Example.com  " }).loginEmail, "learner@example.com");
  assert.equal(activateStudentSchema.safeParse({ studentId, loginEmail: "invalid" }).success, false);
  assert.equal(activateStudentSchema.safeParse({ studentId, loginEmail: "x@example.com", role: "admin" }).success, false);
  assert.equal(checklistSchema.safeParse({ studentId, field: "userId", done: true, expectedAt: null }).success, false);
  assert.equal(checklistSchema.safeParse({ studentId, field: "group1At", done: true }).success, false);
  assert.equal(checklistSchema.safeParse({ studentId, field: "group1At", done: true, expectedAt: null }).success, true);
  assert.equal(confirmTrialLessonSchema.safeParse({ studentId, planLessonId: studentId, completed: true, expectedReportedAt: null, expectedCompletedAt: null }).success, true);
  assert.equal(confirmTrialLessonSchema.safeParse({ studentId, planLessonId: studentId, completed: true }).success, false);
});
