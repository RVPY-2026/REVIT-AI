import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SessionUser } from "../src/lib/auth/permissions";
import { leadSignupSchema, manualLeadSchema } from "../src/lib/schemas/lead";
import { formatStudentCode, studentCodeMonth } from "../src/lib/student-code";
import { commitmentDates } from "../src/lib/study-plan";
import { studentScope } from "../src/server/auth/scope";
import { FOUNDATION_LESSONS } from "../src/server/db/seed/lessons";

const dialect = new PgDialect({ casing: "snake_case" });
const dualUser: SessionUser = {
  id: "staff", email: "staff@example.com", name: "Test", avatarUrl: null,
  roles: ["sale", "student"], sourceIds: ["source-a"], studentId: "own-student",
};
test("multi-role student area cannot inherit a sales or admin scope", () => {
  for (const roles of [["sale", "student"], ["admin", "student"]] as SessionUser["roles"][]) {
    const query = dialect.sqlToQuery(studentScope({ ...dualUser, roles }, "student"));
    assert.deepEqual(query.params, ["own-student"]);
    assert.match(query.sql, /"students"\."id" = \$1/);
    assert.doesNotMatch(query.sql, /source_id|true/);
  }
  assert.equal(dialect.sqlToQuery(studentScope({ ...dualUser, studentId: null }, "student")).sql, "false");
});
test("management scope stays source-bound and denies a student-only caller", () => {
  assert.deepEqual(dialect.sqlToQuery(studentScope(dualUser, "management")).params, ["source-a"]);
  assert.equal(dialect.sqlToQuery(studentScope({ ...dualUser, roles: ["student"] }, "management")).sql, "false");
  assert.equal(dialect.sqlToQuery(studentScope({ ...dualUser, sourceIds: [] }, "management")).sql, "false");
  assert.equal(dialect.sqlToQuery(studentScope({ ...dualUser, roles: ["admin"] }, "management")).sql, "true");
});
test("the code month changes at Vietnamese midnight, including year rollover", () => {
  assert.equal(studentCodeMonth(new Date("2026-10-31T16:59:59Z")), "2610");
  assert.equal(studentCodeMonth(new Date("2026-10-31T17:00:00Z")), "2611");
  assert.equal(studentCodeMonth(new Date("2026-12-31T17:00:00Z")), "2701");
  assert.equal(formatStudentCode("A", "2610", 7), "A2610007");
  assert.throws(() => formatStudentCode("A", "2610", 1000), RangeError);
  assert.throws(() => formatStudentCode("A", "2613", 1), RangeError);
});
test("commitment dates accumulate fractional days instead of rounding each topic", () => {
  assert.deepEqual(commitmentDates("2026-10-08", 1.5, [{ baseDays: 1 }, { baseDays: 1 }, { baseDays: 2 }]),
    ["2026-10-09", "2026-10-11", "2026-10-14"]);
});
test("manual dates anchor subsequent topics; missing durations do not invent dates", () => {
  assert.deepEqual(commitmentDates("2026-10-08", 1, [
    { baseDays: 1 }, { baseDays: null }, { baseDays: 2 },
    { baseDays: null, dueDateOverride: "2026-10-20" }, { baseDays: 3 },
  ]), ["2026-10-09", null, null, "2026-10-20", "2026-10-23"]);
  assert.throws(() => commitmentDates("2026-02-30", 1, []), RangeError);
  assert.throws(() => commitmentDates(null, 0, []), RangeError);
});
test("staff can enter an incomplete lead without weakening the public signup form", () => {
  const input = { fullName: "Test Person", phone: "0901 234 567", sourceId: "00000000-0000-4000-8000-000000000001" };
  assert.equal(manualLeadSchema.parse(input).phone, "0901234567");
  assert.equal(leadSignupSchema.safeParse(input).success, false);
  assert.equal(manualLeadSchema.safeParse({ ...input, sourceId: "invalid" }).success, false);
});

test("trial references select 2/13/14 across the 25-lesson grouped curriculum", () => {
  assert.deepEqual(FOUNDATION_LESSONS.filter((lesson) => lesson.trialOrder !== null)
    .sort((a, b) => a.trialOrder! - b.trialOrder!).map((lesson) => lesson.lessonNumbers), [[2], [13], [14]]);
  assert.equal(FOUNDATION_LESSONS.flatMap((lesson) => lesson.lessonNumbers).length, 25);
  assert.equal(FOUNDATION_LESSONS.reduce((sum, lesson) => sum + lesson.baseDays, 0), 50);
});

import { availabilitySchema, kanbanStageSchema } from "../src/lib/schemas/enrollment";
test("kanban cannot directly activate trial or formal enrollment", () => {
  const studentId = "00000000-0000-4000-8000-000000000001";
  for (const status of ["trial", "enrolled"]) assert.equal(kanbanStageSchema.safeParse({ studentId, status }).success, false);
  assert.equal(kanbanStageSchema.safeParse({ studentId, status: "consulting" }).success, true);
});
test("availability is unspecified or exactly seven days and ten boolean slots", () => {
  assert.equal(availabilitySchema.safeParse([]).success, true);
  const matrix = Array.from({ length: 7 }, () => Array(10).fill(false));
  assert.equal(availabilitySchema.safeParse(matrix).success, true);
  assert.equal(availabilitySchema.safeParse(matrix.slice(1)).success, false);
  assert.equal(availabilitySchema.safeParse(matrix.map(row => row.slice(1))).success, false);
  assert.equal(availabilitySchema.safeParse(matrix.map(row => row.map(() => 1))).success, false);
});


import { safeAreaPath } from "../src/lib/auth/redirect";
import { staffBootstrapSchema } from "../src/lib/schemas/staff-bootstrap";
test("OAuth return paths stay in a permitted area and reject redirect escapes", () => {
  const sale = { roles: ["sale"] as SessionUser["roles"] };
  const student = { roles: ["student"] as SessionUser["roles"] };
  assert.equal(safeAreaPath(sale, "/quan-tri/hoc-vien?status=new"), "/quan-tri/hoc-vien?status=new");
  assert.equal(safeAreaPath(student, "/quan-tri"), "/hoc-vien");
  assert.equal(safeAreaPath(student, "/hoc-vien/../quan-tri"), "/hoc-vien");
  for (const path of ["//evil.example", "/\\evil.example", "https://evil.example", "/auth/callback", "/quan-tri-fake", "/quan-tri/\n"]) {
    assert.equal(safeAreaPath(sale, path), "/quan-tri");
  }
});
test("staff bootstrap requires an admin and a valid sale owner without duplicates", () => {
  const admin = { email: "example.admin@gmail.com", name: "Test admin", roles: ["admin"] };
  const sale = { email: "example.sale@gmail.com", name: "Test sale", roles: ["sale"] };
  const source = { code: "A", name: "Test source", ownerEmail: sale.email };
  assert.equal(staffBootstrapSchema.safeParse({ staff: [admin,sale], sources: [source] }).success, true);
  assert.equal(staffBootstrapSchema.safeParse({ staff: [sale] }).success, false);
  assert.equal(staffBootstrapSchema.safeParse({ staff: [admin], sources: [source] }).success, false);
  assert.equal(staffBootstrapSchema.safeParse({ staff: [admin,admin] }).success, false);
});
