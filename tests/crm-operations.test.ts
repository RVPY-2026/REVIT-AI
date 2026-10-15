import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { studentFilterSchema } from "../src/lib/schemas/student";
import { studentNoteSchema } from "../src/lib/schemas/student-note";
import { mockExportStudents } from "../src/mocks/students";
import { getMockStudentMessages } from "../src/mocks/templates";
import type { SessionUser } from "../src/lib/auth/permissions";

const studentId = "00000000-0000-4000-8000-000000000001";

test("call note input trims body and enforces UUID and length", () => {
  assert.deepEqual(studentNoteSchema.parse({ studentId, body: "  Gọi lại ngày mai  " }), {
    studentId,
    body: "Gọi lại ngày mai", channel: "call",
  });
  assert.equal(studentNoteSchema.safeParse({ studentId: "not-an-id", body: "Ghi chú" }).success, false);
  assert.equal(studentNoteSchema.safeParse({ studentId, body: "  " }).success, false);
  assert.equal(studentNoteSchema.safeParse({ studentId, body: "x".repeat(4001) }).success, false);
});

test("template renderer keeps unknown placeholder keys visible", async () => {
  process.env.DATABASE_URL ??= "postgres://localhost:5432/rvpy_test";
  const { renderMessageTemplate } = await import("../src/server/queries/templates");
  const rendered = renderMessageTemplate(
    "Chào {{ ten }} / {{hoc_phi}} / {{ma_thanh_toan}} / {{ma_license}} / {{constructor}} / {{__proto__}}",
    { id: studentId, fullName: "Nguyễn Minh Anh", code: "A2610001", phone: "0901234567" },
  );
  assert.equal(rendered, "Chào Nguyễn Minh Anh / {{hoc_phi}} / {{ma_thanh_toan}} / {{ma_license}} / {{constructor}} / {{__proto__}}");
});

test("mock student messages contain no payment or license fields", () => {
  const user: SessionUser = {
    id: "mock-admin", email: "admin@example.com", name: "Quản trị (mock)", avatarUrl: null,
    roles: ["admin"], sourceIds: [], studentId: null,
  };
  const messages = getMockStudentMessages(user, "mock-student-1");
  assert.ok(messages.length > 0);
  for (const message of messages) {
    assert.deepEqual(Object.keys(message).sort(), ["body", "forStatus", "id", "title"]);
    assert.equal("payment" in message, false);
    assert.equal("license" in message, false);
    assert.equal("amountVnd" in message, false);
  }

  const saleA = { ...user, id: "mock-sale-a", roles: ["sale"] as SessionUser["roles"], sourceIds: ["mock-source-a"] };
  assert.deepEqual(getMockStudentMessages(saleA, "mock-student-2"), []);
});

test("students workbook applies filters but exports every matched row with Vietnamese labels", async () => {
  process.env.DATABASE_URL ??= "postgres://localhost:5432/rvpy_test";
  const { createStudentsWorkbook } = await import("../src/app/api/export/students/workbook");
  const admin: SessionUser = {
    id: "mock-admin", email: "admin@example.com", name: "Quản trị (mock)", avatarUrl: null,
    roles: ["admin"], sourceIds: [], studentId: null,
  };
  const allRows = mockExportStudents(admin, studentFilterSchema.parse({ page: "1", pageSize: "1" }));
  const allBuffer = await createStudentsWorkbook(allRows);
  const allWorkbook = new ExcelJS.Workbook();
  await allWorkbook.xlsx.load(allBuffer as unknown as Parameters<typeof allWorkbook.xlsx.load>[0]);
  const allSheet = allWorkbook.getWorksheet("Học viên");
  assert.equal(allSheet?.rowCount, allRows.length + 1, "export includes all filtered rows despite pageSize=1");
  assert.ok(allRows.length > 3);
  assert.equal(allSheet?.getCell("A2").value, allRows[0].code);

  const filteredRows = mockExportStudents(admin, studentFilterSchema.parse({ status: "new", pageSize: "1" }));
  const filteredBuffer = await createStudentsWorkbook(filteredRows);
  const filteredWorkbook = new ExcelJS.Workbook();
  await filteredWorkbook.xlsx.load(filteredBuffer as unknown as Parameters<typeof filteredWorkbook.xlsx.load>[0]);
  const filteredSheet = filteredWorkbook.getWorksheet("Học viên");
  assert.equal(filteredSheet?.rowCount, filteredRows.length + 1);
  assert.ok(filteredRows.every((row) => row.status === "new"));
  assert.equal(filteredSheet?.getCell("A2").value, filteredRows[0].code);
  assert.equal(filteredSheet?.getCell("E2").value, "Mới đăng ký");
});
