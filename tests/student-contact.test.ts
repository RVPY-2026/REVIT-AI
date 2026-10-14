import assert from "node:assert/strict";
import test from "node:test";
import { updateStudentContactSchema } from "../src/lib/schemas/student-contact";

const studentId = "00000000-0000-4000-8000-000000000001";

test("student contact schema normalizes name, phone, and any valid staff email", () => {
  assert.deepEqual(updateStudentContactSchema.parse({
    studentId,
    fullName: "  Nguyễn Minh Anh  ",
    phone: "090-123-4567",
    email: "  PERSON@Example.COM ",
  }), {
    studentId,
    fullName: "Nguyễn Minh Anh",
    phone: "0901234567",
    email: "person@example.com",
  });
});

test("blank email clears the optional contact email", () => {
  assert.equal(updateStudentContactSchema.parse({
    studentId,
    fullName: "Nguyễn Minh Anh",
    phone: "0901234567",
    email: "   ",
  }).email, null);
});

test("contact schema rejects unwanted fields and invalid contact values", () => {
  const valid = { studentId, fullName: "Nguyễn Minh Anh", phone: "0901234567", email: "person@example.com" };
  assert.equal(updateStudentContactSchema.safeParse({ ...valid, status: "enrolled" }).success, false);
  assert.equal(updateStudentContactSchema.safeParse({ ...valid, userId: studentId }).success, false);
  assert.equal(updateStudentContactSchema.safeParse({ ...valid, studentId: "not-a-uuid" }).success, false);
  assert.equal(updateStudentContactSchema.safeParse({ ...valid, fullName: " " }).success, false);
  assert.equal(updateStudentContactSchema.safeParse({ ...valid, phone: "1234567890" }).success, false);
  assert.equal(updateStudentContactSchema.safeParse({ ...valid, email: "invalid" }).success, false);
});
