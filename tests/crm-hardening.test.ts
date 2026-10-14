import assert from "node:assert/strict";
import test from "node:test";
import { followUpState, needsFollowUp, vietnamDateTimeInput, vietnamDateTimeInstant } from "../src/lib/follow-up";
import { normalizePhone } from "../src/lib/phone";
import { studentSearchText } from "../src/lib/student-search";
import { updateStudentStatusSchema, bulkUpdateStudentStatusSchema } from "../src/lib/schemas/student-status";
import { archiveStudentSchema } from "../src/lib/schemas/student-management";
import { studentNoteSchema } from "../src/lib/schemas/student-note";
import { studentFilterParams } from "../src/lib/student-filter-url";
import { mockPhoneMatches, mockListStudents } from "../src/mocks/students";
import type { SessionUser } from "../src/lib/auth/permissions";
import { canCorrectContactNote } from "../src/lib/contact-note";

const id = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-14T03:00:00Z");
test("note corrections include the exact 15-minute boundary but exclude later, foreign and future notes", () => {
  assert.equal(canCorrectContactNote(new Date(now.getTime() - 15 * 60_000), id, id, now), true);
  assert.equal(canCorrectContactNote(new Date(now.getTime() - 15 * 60_000 - 1), id, id, now), false);
  assert.equal(canCorrectContactNote(now, null, id, now), false);
  assert.equal(canCorrectContactNote(now, "someone-else", id, now), false);
  assert.equal(canCorrectContactNote(new Date(now.getTime() + 1), id, id, now), false);
});
test("follow-up state matrix uses the latest schedule before the contact-age fallback", async t => {
  const cases = [
    { name: "new with no contact", student: { status: "new", lastContactAt: null }, kind: "uncontacted", due: true },
    { name: "consulting with no contact", student: { status: "consulting", lastContactAt: null }, kind: "uncontacted", due: true },
    { name: "trial without contact", student: { status: "trial", lastContactAt: null }, kind: "uncontacted", due: true },
    { name: "fresh contact", student: { status: "new", lastContactAt: "2026-10-14T02:00:00Z" }, kind: "ok", due: false },
    { name: "previous Vietnam day", student: { status: "trial", lastContactAt: "2026-10-12T17:00:00Z" }, kind: "ok", due: false },
    { name: "two Vietnam calendar days", student: { status: "consulting", lastContactAt: "2026-10-12T16:59:59Z" }, kind: "overdue", due: true },
    { name: "past appointment beats fresh contact", student: { status: "trial", lastContactAt: now.toISOString(), nextActionAt: "2026-10-14T02:59:59Z" }, kind: "due", due: true },
    { name: "exact appointment is due", student: { status: "new", lastContactAt: now.toISOString(), nextActionAt: now.toISOString() }, kind: "due", due: true },
    { name: "future appointment beats old contact", student: { status: "consulting", lastContactAt: "2020-01-01T00:00:00Z", nextActionAt: "2026-10-14T03:00:01Z" }, kind: "scheduled", due: false },
    { name: "no schedule falls back", student: { status: "new", lastContactAt: "2020-01-01T00:00:00Z", nextActionAt: null }, kind: "overdue", due: true },
    { name: "enrolled ignores overdue appointments", student: { status: "enrolled", lastContactAt: null, nextActionAt: "2020-01-01T00:00:00Z" }, kind: "none", due: false },
    { name: "dropped has no follow-up", student: { status: "dropped", lastContactAt: null }, kind: "none", due: false },
    { name: "archive overrides appointment", student: { status: "new", lastContactAt: null, archivedAt: now.toISOString(), nextActionAt: "2020-01-01T00:00:00Z" }, kind: "none", due: false },
  ] as const;
  for (const item of cases) await t.test(item.name, () => {
    assert.equal(followUpState(item.student, now).kind, item.kind);
    assert.equal(needsFollowUp(item.student, now), item.due);
  });
  const due = followUpState({ status: "new", lastContactAt: now.toISOString(), nextActionAt: "2026-10-12T17:00:00Z" }, now);
  assert.deepEqual(due, { kind: "due", days: 1, label: "Quá hạn hẹn 1 ngày" });
});

test("Vietnam wall-clock input round trips across the UTC day boundary", () => {
  assert.equal(vietnamDateTimeInput(new Date("2026-10-14T17:00:00Z")), "2026-10-15T00:00");
  assert.equal(vietnamDateTimeInstant("2026-10-15T00:00"), "2026-10-14T17:00:00.000Z");
  assert.equal(vietnamDateTimeInstant(""), null);
});

test("phone and Vietnamese search normalization handle canonical, international and decomposed input", () => {
  for (const phone of ["0901 234 567", "+84901234567", "84901234567", "0901234567"]) assert.equal(normalizePhone(phone), "0901234567");
  assert.equal(studentSearchText("Nguyễn Đặng Ứng"), "nguyen dang ung");
  assert.equal(studentSearchText("Nguyễn".normalize("NFD")), "nguyen");
});

test("drop reasons, bulk restrictions, archive reasons and structured notes validate at the server boundary", () => {
  assert.equal(updateStudentStatusSchema.safeParse({ studentId: id, status: "dropped" }).success, false);
  assert.equal(updateStudentStatusSchema.safeParse({ studentId: id, status: "dropped", reason: "other" }).success, false);
  assert.equal(updateStudentStatusSchema.safeParse({ studentId: id, status: "dropped", reason: "price" }).success, true);
  assert.equal(updateStudentStatusSchema.safeParse({ studentId: id, status: "consulting", expectedStatus: "dropped" }).success, true);
  for (const status of ["new", "trial", "enrolled"]) assert.equal(bulkUpdateStudentStatusSchema.safeParse({ studentIds: [id], status, expectedStatuses: { [id]: "new" } }).success, false);
  assert.equal(bulkUpdateStudentStatusSchema.safeParse({ studentIds: [id], status: "consulting" }).success, false);
  assert.equal(bulkUpdateStudentStatusSchema.safeParse({ studentIds: Array(101).fill(id), status: "consulting", expectedStatuses: {} }).success, false);
  assert.equal(archiveStudentSchema.safeParse({ studentId: id, reason: "other", expectedArchivedAt: null }).success, false);
  assert.equal(studentNoteSchema.safeParse({ studentId: id, body: "Note", channel: "email" }).success, false);
  assert.equal(studentNoteSchema.safeParse({ studentId: id, body: "Note", nextActionAt: "2026-10-15T10:00" }).success, false);
});

test("mock matches redact foreign profiles and archived quick views are admin-only and shareable", () => {
  const admin: SessionUser = { id, email: "mock@example.invalid", name: "Fixture", roles: ["admin"], sourceIds: [], studentId: null, avatarUrl: null };
  const sale = { ...admin, roles: ["sale"] as SessionUser["roles"], sourceIds: ["mock-source-a"] };
  const matches = mockPhoneMatches(sale, "+84901234567");
  assert.equal(matches.filter(match => "otherSource" in match).length, 1);
  assert.deepEqual(matches.find(match => "otherSource" in match), { otherSource: true });
  assert.ok(!JSON.stringify(matches).includes("Lý Bảo Châu"));
  assert.ok(mockListStudents(admin, { archived: "true" }).rows.every(row => row.archivedAt));
  assert.ok(mockListStudents(admin, {}).rows.every(row => !row.archivedAt));
  assert.throws(() => mockListStudents(sale, { archived: "true" }), /Forbidden/);
  assert.equal(studentFilterParams({ followUp: "due", sort: "nextActionAt", pageSize: 100 }).get("followUp"), "due");
  assert.equal(studentFilterParams({ quickView: "all", archived: "true" }).get("archived"), "true");
});
