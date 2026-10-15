import "server-only";
import ExcelJS from "exceljs";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { StudentStatus } from "@/lib/constants";
import {
  SHEET_STATUS, formatCode, headerKey, isNoteText, isZaloFriend, normalizeBirthYear, normalizeCodeMonth, normalizeEmail,
  normalizeOccupation, normalizePhone, normalizeSeq, normalizeSpecialty, sheetTimeToInstant, text,
} from "@/lib/import-sheet";
import { audit } from "@/server/audit";
import { db, type Db } from "@/server/db";
import { adSources, callNotes, deletedStudentCodes, sourceMonthCounters, students, studentStatusEvents } from "@/server/db/schema";

/**
 * Registration-sheet import shared by the admin page and `pnpm db:import` (BACKEND_RULES §7).
 * New codes are inserted. Existing students are only touched when `updateExisting` is on, and then
 * only in ways that cannot overwrite work done on the website.
 */

export const IMPORT_NOTE = "Nhập từ Google Sheet";
export const UPDATE_NOTE = "Cập nhật từ Google Sheet";
export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

const COLUMNS = {
  timestamp: "dấu thời gian", status: "column 18", label: "a", group: "nhóm", seq: "mã số", month: "ngày tháng",
  specialty: "chuyên ngành", fullName: "họ và tên", birthYear: "năm sinh", hometown: "quê quán (tỉnh/ thành phố)",
  email: "gmail để nhận giáo trình, bài thu hoạch và clip mỗi buổi học", phone: "số điện thoại zalo", courseLink: "link khoá học",
  heardAbout: "bạn biết đến rvpy qua ai hay kênh nào ?",
  goal: "mong muốn của bạn cần rvpy ocean studio training những nội dung nào cho công việc và học tập?",
  occupation: "nghề nghiệp", proposedFee: "đề xuất", organization: "đơn vị công tác, học tập", telesale: "telesale", note: "note",
  facebook: "link facebook", zaloFriend: "bạn giúp xác nhận đã kết bạn zalo với rvpy ocean studio qua mã qr trên (0969071561)",
} as const;
type Field = keyof typeof COLUMNS;
const OPTIONAL: Field[] = ["courseLink", "facebook", "goal"];

export type ParsedRow = {
  rowNumber: number; source: string; month: string; seq: number; code: string; fullName: string; phone: string; email: string | null;
  status: StudentStatus; signedUpAt: Date; occupation: string | null; birthYear: number | null; specialty: string | null;
  hometown: string | null; organization: string | null; label: string | null; zaloFriend: boolean;
  signupAnswers: Record<string, string>; legacyRaw: Record<string, unknown>; noteBody: string | null;
};

export type ParseIssues = { blank: number; badCode: number[]; badPhone: number[]; unknownStatus: number[]; duplicateCode: number[]; badEmail: number };
export type ParseResult = { rows: ParsedRow[]; issues: ParseIssues };

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return value.result;
    if ("text" in value) return value.text;
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
  }
  return value;
}

export class SheetFormatError extends Error {}

export async function parseStudentSheet(data: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(data); } catch { throw new SheetFormatError("Không đọc được file. Hãy tải file .xlsx xuất từ Google Sheet."); }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new SheetFormatError("File không có sheet nào.");
  const columnOf = new Map<Field, number>();
  sheet.getRow(1).eachCell((cell, index) => {
    const key = headerKey(cellValue(cell.value));
    for (const [field, wanted] of Object.entries(COLUMNS) as [Field, string][]) if (key === wanted && !columnOf.has(field)) columnOf.set(field, index);
  });
  const missing = (Object.keys(COLUMNS) as Field[]).filter((field) => !columnOf.has(field) && !OPTIONAL.includes(field));
  if (missing.length) throw new SheetFormatError(`Sheet đầu tiên thiếu cột: ${missing.map((field) => COLUMNS[field]).join(", ")}. Hãy dùng đúng file đăng ký khóa Revit.`);
  const read = (row: ExcelJS.Row, field: Field) => { const index = columnOf.get(field); return index ? cellValue(row.getCell(index).value) : null; };

  const issues: ParseIssues = { blank: 0, badCode: [], badPhone: [], unknownStatus: [], duplicateCode: [], badEmail: 0 };
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fullName = text(read(row, "fullName"));
    const rawPhone = read(row, "phone");
    const source = text(read(row, "group"))?.toUpperCase() ?? null;
    if (!fullName && !text(rawPhone) && !source) { issues.blank += 1; return; }
    const month = normalizeCodeMonth(read(row, "month"));
    const seq = normalizeSeq(read(row, "seq"));
    if (!fullName || !source || !/^[A-Z]$/.test(source) || !month || !seq) { issues.badCode.push(rowNumber); return; }
    const phone = normalizePhone(rawPhone);
    if (!phone) { issues.badPhone.push(rowNumber); return; }
    const statusLabel = text(read(row, "status"));
    const status = statusLabel ? SHEET_STATUS[statusLabel.toUpperCase()] : undefined;
    if (!status) { issues.unknownStatus.push(rowNumber); return; }
    const code = formatCode(source, month, seq);
    if (seen.has(code)) { issues.duplicateCode.push(rowNumber); return; }
    seen.add(code);
    const emailRaw = text(read(row, "email"));
    const email = normalizeEmail(emailRaw);
    if (emailRaw && !email) issues.badEmail += 1;
    const telesale = text(read(row, "telesale"));
    const note = text(read(row, "note"));
    const answers: Record<string, string> = {};
    for (const [key, field] of [["heardAbout", "heardAbout"], ["learningGoal", "goal"], ["facebook", "facebook"]] as const) {
      const value = text(read(row, field));
      if (value) answers[key] = value;
    }
    const noteParts = [isNoteText(telesale) ? `Telesale: ${telesale}` : null, note ? `Ghi chú: ${note}` : null].filter(Boolean);
    rows.push({
      rowNumber, source, month, seq, code, fullName, phone, email, status,
      // Without a timestamp the lead sorts at the start of its code month.
      signedUpAt: sheetTimeToInstant(read(row, "timestamp")) ?? new Date(Date.UTC(2000 + Number(month.slice(0, 2)), Number(month.slice(2)) - 1, 1) - 7 * 3_600_000),
      occupation: normalizeOccupation(read(row, "occupation")), birthYear: normalizeBirthYear(read(row, "birthYear")),
      specialty: normalizeSpecialty(read(row, "specialty")), hometown: text(read(row, "hometown")), organization: text(read(row, "organization")),
      label: text(read(row, "label")), zaloFriend: isZaloFriend(read(row, "zaloFriend")), signupAnswers: answers,
      legacyRaw: { sheetRow: rowNumber, proposedFee: text(read(row, "proposedFee")), telesale, note, courseLink: text(read(row, "courseLink")), statusLabel },
      noteBody: noteParts.length ? `${IMPORT_NOTE}. ${noteParts.join(" · ")}` : null,
    });
  });
  return { rows, issues };
}

type FillField = "email" | "occupation" | "birthYear" | "specialty" | "hometown" | "organization";
const FILL_FIELDS: FillField[] = ["email", "occupation", "birthYear", "specialty", "hometown", "organization"];

export type ExistingChange = {
  id: string; code: string; fullName: string;
  fill: Partial<Record<FillField, string | number>>;
  statusChange: { from: StudentStatus; to: StudentStatus } | null;
  statusConflict: { site: StudentStatus; sheet: StudentStatus } | null;
  newNote: string | null;
};

export type ImportPlan = {
  parse: ParseResult;
  newRows: ParsedRow[];
  missingSources: string[];
  existingCount: number;
  changes: ExistingChange[];
};

/** Compare the sheet with the database without writing anything. */
export async function planStudentImport(parse: ParseResult, conn: Db = db): Promise<ImportPlan> {
  const codes = parse.rows.map((row) => row.code);
  const burned = codes.length ? await conn.select({ code: deletedStudentCodes.code }).from(deletedStudentCodes)
    .where(inArray(deletedStudentCodes.code, codes)).limit(1) : [];
  if (burned.length) throw new Error("Bản nhập có mã học viên đã xóa vĩnh viễn. Bạn loại mã này khỏi bản nhập để tránh tạo lại hồ sơ.");
  const found = codes.length ? await conn.select({
    id: students.id, code: students.code, fullName: students.fullName, status: students.status, email: students.email,
    occupation: students.occupation, birthYear: students.birthYear, specialty: students.specialty, hometown: students.hometown, organization: students.organization,
    archivedAt: students.archivedAt,
  }).from(students).where(inArray(students.code, codes)) : [];
  const byCode = new Map(found.map((row) => [row.code, row]));
  const ids = found.map((row) => row.id);
  const [events, notes] = ids.length ? await Promise.all([
    conn.select({ studentId: studentStatusEvents.studentId, note: studentStatusEvents.note, createdAt: studentStatusEvents.createdAt })
      .from(studentStatusEvents).where(inArray(studentStatusEvents.studentId, ids)).orderBy(desc(studentStatusEvents.createdAt)),
    conn.select({ studentId: callNotes.studentId, body: callNotes.body }).from(callNotes).where(inArray(callNotes.studentId, ids)),
  ]) : [[], []];
  const latestEvent = new Map<string, string | null>();
  for (const event of events) if (!latestEvent.has(event.studentId)) latestEvent.set(event.studentId, event.note);
  const noteBodies = new Map<string, Set<string>>();
  for (const note of notes) noteBodies.set(note.studentId, (noteBodies.get(note.studentId) ?? new Set()).add(note.body));

  const sources = await conn.select({ code: adSources.code }).from(adSources);
  const known = new Set(sources.map((row) => row.code));
  const changes: ExistingChange[] = [];
  for (const row of parse.rows) {
    const current = byCode.get(row.code);
    if (!current) continue;
    // Keep the immutable code recognized, but archived profiles cannot be patched or noted.
    if (current.archivedAt) continue;
    const fill: ExistingChange["fill"] = {};
    for (const field of FILL_FIELDS) if ((current[field] === null || current[field] === "") && row[field] !== null) fill[field] = row[field]!;
    let statusChange: ExistingChange["statusChange"] = null;
    let statusConflict: ExistingChange["statusConflict"] = null;
    if (row.status !== current.status) {
      // Only an untouched status may follow the sheet; anything edited on the website stays.
      const last = latestEvent.get(current.id);
      const untouched = !latestEvent.has(current.id) || last === IMPORT_NOTE || last === UPDATE_NOTE;
      if (untouched) statusChange = { from: current.status, to: row.status }; else statusConflict = { site: current.status, sheet: row.status };
    }
    const newNote = row.noteBody && !noteBodies.get(current.id)?.has(row.noteBody) ? row.noteBody : null;
    if (Object.keys(fill).length || statusChange || statusConflict || newNote) changes.push({ id: current.id, code: row.code, fullName: current.fullName, fill, statusChange, statusConflict, newNote });
  }
  return {
    parse, newRows: parse.rows.filter((row) => !byCode.has(row.code)),
    missingSources: [...new Set(parse.rows.filter((row) => !byCode.has(row.code)).map((row) => row.source))].filter((code) => !known.has(code)),
    existingCount: byCode.size, changes,
  };
}

export type ImportResult = { inserted: number; updated: number; statusChanged: number; notesAdded: number; createdSources: string[]; skippedFields: number; skippedStatuses: number };

/** Write the plan in one transaction; `updateExisting` decides whether existing students are touched. */
export async function applyStudentImport(preview: ImportPlan, actorId: string | null, updateExisting: boolean, conn: Db = db): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, statusChanged: 0, notesAdded: 0, createdSources: [], skippedFields: 0, skippedStatuses: 0 };
  await conn.transaction(async (tx) => {
    // Serialize imports, then lock profiles in stable order before recalculating every change.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('rvpy-student-sheet-import'))`);
    const codes = preview.parse.rows.map((row) => row.code);
    if (codes.length) await tx.select({ id: students.id }).from(students).where(inArray(students.code, codes))
      .orderBy(asc(students.id)).for("update");
    const plan = await planStudentImport(preview.parse, tx as unknown as Db);
    if (updateExisting) {
      const current = new Map(plan.changes.map((change) => [change.id, change]));
      for (const change of preview.changes) {
        for (const field of Object.keys(change.fill) as FillField[]) if (!Object.hasOwn(current.get(change.id)?.fill ?? {}, field)) result.skippedFields++;
        if (change.statusChange && !current.get(change.id)?.statusChange) result.skippedStatuses++;
      }
    }
    const sourceRows = await tx.select({ id: adSources.id, code: adSources.code }).from(adSources);
    const sourceId = new Map(sourceRows.map((row) => [row.code, row.id]));
    const missing = plan.missingSources.filter((code) => !sourceId.has(code));
    if (missing.length) {
      // No owner yet: only admins see these leads until a sale account is attached to the source.
      const created = await tx.insert(adSources).values(missing.map((code) => ({ code, name: `Nguồn ${code}` }))).returning({ id: adSources.id, code: adSources.code });
      for (const row of created) { sourceId.set(row.code, row.id); result.createdSources.push(row.code); }
    }
    for (let start = 0; start < plan.newRows.length; start += 100) {
      const chunk = plan.newRows.slice(start, start + 100);
      const inserted = await tx.insert(students).values(chunk.map((row) => ({
        code: row.code, codeMonth: row.month, sourceId: sourceId.get(row.source)!, seq: row.seq, fullName: row.fullName, phone: row.phone,
        email: row.email, occupation: row.occupation, birthYear: row.birthYear, specialty: row.specialty, hometown: row.hometown,
        organization: row.organization, legacyLabel: row.label, legacyRaw: row.legacyRaw, signupAnswers: row.signupAnswers,
        zaloFriendAt: row.zaloFriend ? row.signedUpAt : null, status: row.status, signedUpAt: row.signedUpAt,
      }))).returning({ id: students.id, code: students.code });
      const byCode = new Map(chunk.map((row) => [row.code, row]));
      await tx.insert(studentStatusEvents).values(inserted.map((row) => ({
        studentId: row.id, fromStatus: null, toStatus: byCode.get(row.code)!.status, note: IMPORT_NOTE, createdAt: byCode.get(row.code)!.signedUpAt,
      })));
      const notes = inserted.flatMap((row) => { const body = byCode.get(row.code)!.noteBody; return body ? [{ studentId: row.id, body, authorId: null, createdAt: byCode.get(row.code)!.signedUpAt }] : []; });
      if (notes.length) await tx.insert(callNotes).values(notes);
      result.inserted += inserted.length;
    }
    // New web sign-ups must continue after the highest imported number for each source and month.
    const highest = new Map<string, { source: string; month: string; seq: number }>();
    for (const row of plan.newRows) {
      const key = `${row.source}${row.month}`;
      const current = highest.get(key);
      if (!current || row.seq > current.seq) highest.set(key, { source: row.source, month: row.month, seq: row.seq });
    }
    for (const { source, month, seq } of highest.values()) {
      await tx.insert(sourceMonthCounters).values({ sourceId: sourceId.get(source)!, codeMonth: month, nextSeq: seq + 1 })
        .onConflictDoUpdate({ target: [sourceMonthCounters.sourceId, sourceMonthCounters.codeMonth], set: { nextSeq: sql`greatest(${sourceMonthCounters.nextSeq}, ${seq + 1})` } });
    }
    if (updateExisting) {
      for (const change of [...plan.changes].sort((a, b) => a.id.localeCompare(b.id))) {
        const patch: Record<string, unknown> = { ...change.fill };
        if (change.statusChange) patch.status = change.statusChange.to;
        if (Object.keys(patch).length) {
          // Rebuilt under row locks; retain the status guard as defense in depth.
          const guard = change.statusChange ? and(eq(students.id, change.id), eq(students.status, change.statusChange.from)) : eq(students.id, change.id);
          const [row] = await tx.update(students).set(patch).where(guard).returning({ id: students.id });
          if (row) {
            result.updated += 1;
            if (change.statusChange) {
              await tx.insert(studentStatusEvents).values({ studentId: change.id, fromStatus: change.statusChange.from, toStatus: change.statusChange.to, note: UPDATE_NOTE });
              result.statusChanged += 1;
            }
          }
        }
        if (change.newNote) { await tx.insert(callNotes).values({ studentId: change.id, body: change.newNote, authorId: null }); result.notesAdded += 1; }
      }
    }
    await audit(tx, { actorId, action: "students.sheet_imported", entity: "students", data: { ...result, updateExisting } });
  });
  return result;
}
