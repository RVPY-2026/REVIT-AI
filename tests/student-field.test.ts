import assert from "node:assert/strict";
import test from "node:test";
import { updateStudentFieldSchema } from "../src/lib/schemas/student-field";

const base = { studentId: "11111111-1111-4111-8111-111111111111", field: "birthYear", expectedValue: "" } as const;
const messageFor = (value: string) => {
  const result = updateStudentFieldSchema.safeParse({ ...base, value });
  return result.success ? null : result.error.issues[0]?.message;
};

test("birth year errors are Vietnamese messages, never a generic union error", () => {
  assert.equal(messageFor("12"), "Năm sinh gồm 4 chữ số");
  assert.equal(messageFor("abcd"), "Năm sinh gồm 4 chữ số");
  assert.equal(messageFor("1850"), "Năm sinh chưa hợp lệ");
  assert.equal(messageFor(String(new Date().getFullYear() + 1)), "Năm sinh chưa hợp lệ");
});

test("birth year accepts a plausible year or an empty value that clears the field", () => {
  assert.equal(messageFor("1995"), null);
  assert.equal(messageFor(""), null);
  assert.equal(messageFor("  1995  "), null);
});
