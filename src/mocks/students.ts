import { isAdmin, type SessionUser } from "@/lib/auth/permissions";
import { normalizePhone } from "@/lib/phone";
import type { PhoneMatch } from "@/server/phone-matches";
import { STUDENT_STATUSES } from "@/lib/constants";
import { businessDayStart, followUpState, needsFollowUp } from "@/lib/follow-up";
import { studentSearchText } from "@/lib/student-search";
import { DEFAULT_SORT_DIR, studentFilterSchema, studentMonthRange, type StudentDetail, type StudentOverview, type StudentFilter, type StudentList, type StudentSummary } from "@/lib/schemas/student";

const sources = [
  { id: "mock-source-a", code: "A", name: "Sale A", active: true },
  { id: "mock-source-b", code: "B", name: "Sale B", active: true },
  { id: "mock-source-r", code: "R", name: "RVPY", active: true },
];

const DAY = 86_400_000;
/** Mock dates move with the clock so the dashboard always has "today" and "overdue" examples. */
const ago = (days: number, hour = 3) => new Date(businessDayStart(new Date()).getTime() - days * DAY + hour * 3_600_000).toISOString();

type Seed = [id: number, code: string, name: string, phone: string, status: StudentSummary["status"], source: "a" | "b" | "r", signedDaysAgo: number | string, contactDaysAgo: number | null];
const seeds: Seed[] = [
  [1, "A2610001", "Nguyễn Minh Anh", "0901234567", "consulting", "a", 1, 3],
  [2, "B2610001", "Trần Quốc Bảo", "0912345678", "trial", "b", 2, 0],
  // A fixed instant just after midnight on 1 October in Vietnam keeps the month-boundary test meaningful.
  [3, "R2610001", "Lê Thu Hà", "0987654321", "new", "r", "2026-09-30T17:30:00.000Z", null],
  [4, "A2610002", "Phạm Đức Long", "0933445566", "new", "a", 0, null],
  [5, "A2610003", "Võ Ngọc Mai", "0944556677", "consulting", "a", 4, 1],
  [6, "B2610002", "Đặng Hoàng Nam", "0955667788", "new", "b", 3, null],
  [7, "R2610002", "Bùi Thanh Tú", "0966778899", "enrolled", "r", 12, 5],
  [8, "A2610004", "Hoàng Gia Huy", "0977889900", "dropped", "a", 15, 9],
  [9, "B2610003", "Ngô Phương Linh", "0988990011", "trial", "b", 6, 4],
  [10, "A2610005", "Đỗ Khánh Vy", "0922113344", "enrolled", "a", 9, 2],
  [11, "R2610003", "Trịnh Quang Vinh", "0911223344", "consulting", "r", 8, 2],
  [12, "B2610004", "Lý Bảo Châu", "0901234567", "new", "b", 10, null],
];
const sourceById = { a: sources[0], b: sources[1], r: sources[2] };
const occupations = ["Đang đi làm", "Sinh viên"];
const specialties = ["Kiến trúc", "Kết cấu", "MEP"];

const rows: StudentDetail[] = seeds.map(([n, code, fullName, phone, status, source, signed, contact]) => ({
  id: `mock-student-${n}`, code, fullName, phone, status,
  email: `${code.toLowerCase()}@example.com`,
  sourceId: sourceById[source].id, sourceCode: sourceById[source].code, sourceName: sourceById[source].name,
  signedUpAt: typeof signed === "string" ? signed : ago(signed), lastContactAt: contact === null ? null : ago(contact, 9),
  occupation: occupations[n % 2], birthYear: 1990 + (n % 12), specialty: specialties[n % 3], hometown: "Hà Nội",
  organization: "Studio Mẫu", zaloName: null, signupAnswers: (n === 1 ? { heardAbout: "TikTok", experience: "3 năm" } : {}) as Record<string, string>,
  timeline: [], notes: [],
  archivedAt: null, archiveReason: null,
  nextActionAt: n === 5 ? ago(-1, 10) : n === 11 ? ago(1, 10) : null,
  trial: status === "trial" || status === "enrolled" ? { daysLeft: Math.max(0, 9 - Number(signed)), checklist: n % 4, confirmed: n % 3, hasPlan: n !== 9 } : null,
  droppedReason: status === "dropped" ? "price" : null,
  droppedNote: status === "dropped" ? "Học viên cân nhắc học phí." : null,
}));
rows.push({ ...rows[0], id: "mock-student-13", code: "R2610004", sourceId: sources[2].id, sourceCode: "R", sourceName: "RVPY",
  fullName: "Hồ sơ thử đã lưu trữ", phone: "0900000013", archivedAt: ago(1), archiveReason: "test" });
for (const row of rows) {
  if (row.lastContactAt) row.notes = [{ id: `mock-note-${row.id}`, body: "Đã trao đổi về lộ trình học Revit.", authorName: "Nhân viên mẫu", createdAt: row.lastContactAt,
    channel: row.id === "mock-student-5" ? "zalo" : "call", outcome: "thinking", nextActionAt: row.nextActionAt ?? null, editedAt: row.id === "mock-student-5" ? new Date(Date.parse(row.lastContactAt) + 5 * 60_000).toISOString() : null, canEdit: false }];
  if (row.status === "dropped") row.timeline = [{ id: `mock-event-${row.id}`, fromStatus: "consulting", toStatus: "dropped", note: row.droppedNote ?? null, reason: row.droppedReason, kind: "status", createdAt: ago(8) }];
}

function visibleRows(user: SessionUser) {
  if (isAdmin(user)) return rows;
  if (user.roles.includes("sale")) return rows.filter((row) => user.sourceIds.includes(row.sourceId));
  return [];
}

export function mockPhoneMatches(user: SessionUser, phone: string): PhoneMatch[] {
  if (!isAdmin(user) && !user.roles.includes("sale")) throw new Error("Forbidden");
  const matching = rows.filter(row => normalizePhone(row.phone) === normalizePhone(phone));
  const visible = matching.filter(row => isAdmin(user) || user.sourceIds.includes(row.sourceId));
  const result: PhoneMatch[] = visible.map(({ id, code, fullName, status, sourceCode, signedUpAt }) => ({ id, code, fullName, status, sourceCode, signedUpAt }));
  if (matching.some(row => !visible.includes(row))) result.push({ otherSource: true });
  return result;
}

function matches(row: StudentSummary, filter: ReturnType<typeof studentFilterSchema.parse>) {
  if (Boolean(row.archivedAt) !== Boolean(filter.archived)) return false;
  if (filter.status && row.status !== filter.status) return false;
  if (filter.sourceId && row.sourceId !== filter.sourceId) return false;
  if (filter.month) {
    const { start, end } = studentMonthRange(filter.month);
    const signedUpAt = new Date(row.signedUpAt);
    if (signedUpAt < start || signedUpAt >= end) return false;
  }
  if (filter.search) {
    const needle = studentSearchText(filter.search);
    const phone = normalizePhone(filter.search);
    if (![row.fullName, row.email, row.code].some(value => value && studentSearchText(value).includes(needle)) && !(/^[0-9]+$/.test(phone) && normalizePhone(row.phone).includes(phone))) return false;
  }
  if (filter.followUp && (filter.followUp === "due" ? !needsFollowUp(row) : followUpState(row).kind !== filter.followUp)) return false;
  return true;
}

function sortRows(list: StudentSummary[], filter: ReturnType<typeof studentFilterSchema.parse>) {
  const dir = (filter.dir ?? DEFAULT_SORT_DIR[filter.sort]) === "asc" ? 1 : -1;
  const key = (row: StudentSummary): string | number => {
    if (filter.sort === "fullName") return row.fullName;
    if (filter.sort === "status") return STUDENT_STATUSES.indexOf(row.status);
    if (filter.sort === "lastContactAt") return row.lastContactAt ? Date.parse(row.lastContactAt) : -Infinity;
    if (filter.sort === "nextActionAt") return row.nextActionAt ? Date.parse(row.nextActionAt) : (dir === 1 ? Infinity : -Infinity);
    return Date.parse(row.signedUpAt);
  };
  return [...list].sort((a, b) => {
    const ka = key(a), kb = key(b);
    const cmp = typeof ka === "string" ? ka.localeCompare(String(kb), "vi") : ka === kb ? 0 : ka < (kb as number) ? -1 : 1;
    if (filter.sort === "nextActionAt") {
      const contact = (row: StudentSummary) => row.lastContactAt ? Date.parse(row.lastContactAt) : -Infinity;
      const ca = contact(a), cb = contact(b);
      return cmp * dir || (ca === cb ? 0 : ca < cb ? -1 : 1) || Date.parse(a.signedUpAt) - Date.parse(b.signedUpAt);
    }
    return cmp * dir || Date.parse(b.signedUpAt) - Date.parse(a.signedUpAt);
  });
}

export function mockListStudents(user: SessionUser, input: StudentFilter): StudentList {
  const filter = studentFilterSchema.parse(input);
  if (filter.archived && !isAdmin(user)) throw new Error("Forbidden");
  const scoped = sortRows(visibleRows(user).filter((row) => matches(row, filter)).map(toSummary), filter);
  const start = (filter.page - 1) * filter.pageSize;
  const sourceOptions = mockStudentSources(user);
  return {
    rows: scoped.slice(start, start + filter.pageSize).map(row => isAdmin(user) ? { ...row, duplicatePhone: rows.filter(other => normalizePhone(other.phone) === normalizePhone(row.phone)).length > 1 } : row),
    total: scoped.length,
    page: filter.page,
    pageSize: filter.pageSize,
    sources: sourceOptions,
    ...mockStudentFacets(user, filter),
  };
}

export function mockStudentFacets(user: SessionUser, input: StudentFilter) {
  const filter = studentFilterSchema.parse(input);
  if (filter.archived && !isAdmin(user)) throw new Error("Forbidden");
  const base = visibleRows(user).filter(row => matches(row, { ...filter, status: undefined }));
  const counts = Object.fromEntries(STUDENT_STATUSES.map(status => [status, base.filter(row => row.status === status).length])) as Record<StudentSummary["status"], number>;
  const dueCount = visibleRows(user).filter(row => matches(row, { ...filter, followUp: "due" })).length;
  return { counts, dueCount };
}

export function mockStudentSources(user: SessionUser): StudentList["sources"] {
  return isAdmin(user) ? sources : sources.filter((source) => user.sourceIds.includes(source.id));
}

export function mockExportStudents(user: SessionUser, input: StudentFilter): StudentSummary[] {
  const filter = studentFilterSchema.parse(input);
  if (filter.archived && !isAdmin(user)) throw new Error("Forbidden");
  return sortRows(visibleRows(user).filter((row) => matches(row, filter)).map(toSummary), filter);
}

export function mockGetStudent(user: SessionUser, id: string): StudentDetail | null {
  return visibleRows(user).find((row) => row.id === id) ?? null;
}

export function mockStudentOverview(user: SessionUser): StudentOverview {
  const list = mockExportStudents(user, {});
  const counts = Object.fromEntries(STUDENT_STATUSES.map((status) => [status, list.filter((row) => row.status === status).length])) as StudentOverview["counts"];
  const today = businessDayStart(new Date()).getTime();
  const since = (from: number, to = Infinity) => list.filter((row) => { const t = Date.parse(row.signedUpAt); return t >= from && t < to; }).length;
  const weekStart = today - 6 * DAY;
  const withState = (kind: "uncontacted" | "overdue") => list.filter((row) => followUpState(row).kind === kind);
  const uncontacted = withState("uncontacted").sort((a, b) => Date.parse(a.signedUpAt) - Date.parse(b.signedUpAt));
  const overdue = withState("overdue").sort((a, b) => Date.parse(a.lastContactAt!) - Date.parse(b.lastContactAt!));
  return {
    counts, total: list.length, rows: list.slice(0, 5),
    signups: { today: since(today), week: since(weekStart), previousWeek: since(weekStart - 7 * DAY, weekStart) },
    sources: mockStudentSources(user).map((source) => {
      const own = list.filter((row) => row.sourceId === source.id);
      return { id: source.id, code: source.code, name: source.name, total: own.length, enrolled: own.filter((row) => row.status === "enrolled").length };
    }),
    uncontacted: { count: uncontacted.length, rows: uncontacted.slice(0, 5) },
    overdue: { count: overdue.length, rows: overdue.slice(0, 5) },
  };
}

function toSummary(row: StudentDetail): StudentSummary {
  const { id, code, fullName, phone, email, status, sourceId, sourceCode, sourceName, signedUpAt, lastContactAt } = row;
  return { id, code, fullName, phone, email, status, sourceId, sourceCode, sourceName, signedUpAt, lastContactAt,
    nextActionAt: row.nextActionAt, archivedAt: row.archivedAt, archiveReason: row.archiveReason, trial: row.trial,
    droppedReason: row.droppedReason, droppedNote: row.droppedNote };
}
