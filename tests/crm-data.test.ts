import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { studentFilterSchema, studentMonthRange, studentSearchPattern } from "@/lib/schemas/student";
import type { SessionUser } from "@/lib/auth/permissions";
import { studentScope } from "@/server/auth/scope";
import { mockListStudents, mockExportStudents, mockStudentSources } from "@/mocks/students";
import { paginationRange } from "@/lib/pagination";

const saleA: SessionUser = {
  id: "sale-a", email: "a@example.com", name: "Sale A", avatarUrl: null,
  roles: ["sale"], sourceIds: ["source-a"], studentId: null,
};
const dialect = new PgDialect();
const admin: SessionUser = {
  id: "admin", email: "admin@example.com", name: "Admin", avatarUrl: null,
  roles: ["admin"], sourceIds: [], studentId: null,
};

test("source filter options remain scoped for sale and empty assignments", () => {
  assert.deepEqual(mockStudentSources({ ...saleA, sourceIds: ["mock-source-a"] }).map((source) => source.code), ["A"]);
  assert.deepEqual(mockStudentSources({ ...saleA, sourceIds: [] }), []);
  assert.deepEqual(mockStudentSources(admin).map((source) => source.code), ["A", "B", "R"]);
});

test("student filters normalize pagination and reject invalid status/month/source", () => {
  assert.deepEqual(studentFilterSchema.parse({ page: "2", pageSize: "50", search: "  An  " }), {
    search: "An", page: 2, pageSize: 50, sort: "signedUpAt",
  });
  assert.equal(studentFilterSchema.safeParse({ status: "unknown" }).success, false);
  assert.equal(studentFilterSchema.safeParse({ month: "2026-13" }).success, false);
  assert.equal(studentFilterSchema.safeParse({ month: "0099-10" }).success, false);
  assert.equal(studentFilterSchema.safeParse({ sourceId: "source-a" }).success, false);
  assert.equal(studentFilterSchema.parse({ sourceId: "mock-source-a" }).sourceId, "mock-source-a");
  assert.equal(studentFilterSchema.safeParse({ pageSize: 101 }).success, false);
});

test("month range is the Ho Chi Minh business month, including UTC month boundaries", () => {
  const { start, end } = studentMonthRange("2026-10");
  assert.equal(start.toISOString(), "2026-09-30T17:00:00.000Z");
  assert.equal(end.toISOString(), "2026-10-31T17:00:00.000Z");
});

test("an empty month from the search form preserves search, status and source for list and export", () => {
  const filter = studentFilterSchema.parse({ search: "Minh", status: "consulting", sourceId: "mock-source-a", month: "" });
  assert.equal(filter.month, undefined);
  assert.equal(filter.search, "Minh");
  assert.equal(filter.status, "consulting");
  assert.equal(filter.sourceId, "mock-source-a");
  assert.deepEqual(mockListStudents(admin, filter).rows.map((row) => row.code), ["A2610001"]);
  assert.deepEqual(mockExportStudents(admin, filter).map((row) => row.code), ["A2610001"]);
  assert.equal(studentFilterSchema.safeParse({ ...filter, month: "2026-13" }).success, false);
});

test("out-of-range pages recover within the filtered result and empty results return page one", () => {
  const filter = studentFilterSchema.parse({ sourceId: "mock-source-a", status: "consulting", page: 2 });
  const stale = mockListStudents(admin, filter);
  const range = paginationRange(stale.total, stale.page, stale.pageSize);
  assert.deepEqual(range, { page: 1, pageCount: 1, start: 1, end: 2 });
  const recovered = mockListStudents(admin, { ...filter, page: range.page });
  assert.deepEqual(recovered.rows.map((row) => row.code), ["A2610001", "A2610003"]);
  assert.deepEqual(paginationRange(0, 5, 25), { page: 1, pageCount: 1, start: 0, end: 0 });
  assert.deepEqual(paginationRange(51, 4, 25), { page: 3, pageCount: 3, start: 51, end: 51 });
});

test("mock month filter includes a signup at September 30 17:30 UTC in October Vietnam time", () => {
  const october = mockListStudents(admin, { month: "2026-10" });
  const september = mockListStudents(admin, { month: "2026-09" });
  assert.ok(october.rows.some((row) => row.id === "mock-student-3"));
  assert.ok(!september.rows.some((row) => row.id === "mock-student-3"));
});

test("sale scope stays source-bound and search treats SQL wildcards literally", () => {
  const compiled = dialect.sqlToQuery(studentScope(saleA, "management"));
  assert.match(compiled.sql, /students"\."sourceId" in/);
  assert.deepEqual(compiled.params, ["source-a"]);
  assert.equal(studentSearchPattern("An_%\\"), "%An\\_\\%\\\\%");
});
