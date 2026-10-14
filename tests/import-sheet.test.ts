import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCode, isNoteText, normalizeBirthYear, normalizeCodeMonth, normalizeEmail, normalizeOccupation, normalizePhone, normalizeSeq, normalizeSpecialty, sheetTimeToInstant } from "../src/lib/import-sheet";

test("phone numbers are recovered from the formats seen in the sheet", () => {
  assert.equal(normalizePhone("0364552461"), "0364552461");
  assert.equal(normalizePhone("0912 345 678"), "0912345678");
  assert.equal(normalizePhone(912345678), "0912345678");
  assert.equal(normalizePhone("0912345678(Zalo 0987654321)"), "0912345678");
  assert.equal(normalizePhone("+84912345678"), "0912345678");
  assert.equal(normalizePhone("-"), null);
  assert.equal(normalizePhone(null), null);
});

test("code parts accept numbers, floats and padded strings", () => {
  assert.equal(normalizeCodeMonth(2610), "2610");
  assert.equal(normalizeCodeMonth("2501"), "2501");
  assert.equal(normalizeCodeMonth(2613), null);
  assert.equal(normalizeSeq("0018"), 18);
  assert.equal(normalizeSeq("1000"), null);
  assert.equal(formatCode("A", "2610", 18), "A2610018");
});

test("text fields are tidied", () => {
  assert.equal(normalizeOccupation("đã đi làm "), "Đang đi làm");
  assert.equal(normalizeOccupation("Sinh Viên"), "Sinh viên");
  assert.equal(normalizeSpecialty("kts"), "KTS");
  assert.equal(normalizeEmail(" Foo@Gmail.com. "), "foo@gmail.com");
  assert.equal(normalizeEmail("not an email"), null);
  assert.equal(normalizeBirthYear(1995.0), 1995);
  assert.equal(normalizeBirthYear(1800), null);
  assert.equal(isNoteText("Đã gọi => Gửi Video"), true);
  assert.equal(isNoteText("2700000"), false);
});

test("sheet wall-clock time is read as Vietnam time", () => {
  assert.equal(sheetTimeToInstant(new Date("2025-02-23T14:04:30Z"))?.toISOString(), "2025-02-23T07:04:30.000Z");
});
