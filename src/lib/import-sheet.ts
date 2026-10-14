import type { StudentStatus } from "@/lib/constants";

/** Pure helpers for the one-off Google Sheets import; no database or file access here. */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export const SHEET_STATUS: Record<string, StudentStatus> = {
  "ĐÃ ĐĂNG KÝ": "enrolled",
  "CHỜ CHỐT SALE": "consulting",
  "BỎ QUA": "dropped",
};

/** First line of a header cell, lower-cased, so "Họ và tên\n(Ví dụ…)" matches "họ và tên". */
export function headerKey(cell: unknown): string {
  return String(cell ?? "").split("\n")[0].trim().toLowerCase();
}

export function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned && cleaned !== "-" ? cleaned : null;
}

/** Vietnamese mobile number as 10 digits starting with 0, or null when it cannot be recovered. */
export function normalizePhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "number" ? String(Math.round(value)) : String(value);
  const direct = raw.replace(/\D/g, "");
  if (/^0\d{9}$/.test(direct)) return direct;
  if (/^84\d{9}$/.test(direct)) return `0${direct.slice(2)}`;
  if (/^\d{9}$/.test(direct)) return `0${direct}`;
  // "0912345678 (Zalo 0987654321)": take the first full number inside the text.
  const embedded = raw.replace(/[\s.\-]/g, "").match(/0\d{9}/);
  return embedded ? embedded[0] : null;
}

export function normalizeEmail(value: unknown): string | null {
  const cleaned = text(value)?.toLowerCase().replace(/^[<"'“”\s]+|[>"'“”.,;\s]+$/g, "");
  return cleaned && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleaned) ? cleaned : null;
}

export function normalizeOccupation(value: unknown): string | null {
  const cleaned = text(value);
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (lower.includes("sinh")) return "Sinh viên";
  if (lower.includes("làm")) return "Đang đi làm";
  return cleaned;
}

/** Short discipline codes (kts, MEP) are written in capitals; longer text is kept as typed. */
export function normalizeSpecialty(value: unknown): string | null {
  const cleaned = text(value);
  if (!cleaned) return null;
  return cleaned.length <= 5 ? cleaned.toUpperCase() : cleaned;
}

export function normalizeBirthYear(value: unknown, now = new Date()): number | null {
  const year = Math.round(Number(value));
  return Number.isInteger(year) && year >= 1900 && year <= now.getFullYear() ? year : null;
}

/** NGÀY THÁNG arrives as 2501, "2501" or 2501.0. */
export function normalizeCodeMonth(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const digits = String(Math.round(Number(value))).padStart(4, "0");
  return /^\d{2}(0[1-9]|1[0-2])$/.test(digits) ? digits : null;
}

/** MÃ SỐ arrives as "001", "0018" or 18. */
export function normalizeSeq(value: unknown): number | null {
  const seq = Math.round(Number(value));
  return Number.isInteger(seq) && seq >= 1 && seq <= 999 ? seq : null;
}

export function formatCode(source: string, month: string, seq: number): string {
  return `${source}${month}${String(seq).padStart(3, "0")}`;
}

/** The sheet stores wall-clock time in Vietnam, but spreadsheet readers hand it back as if it were UTC. */
export function sheetTimeToInstant(value: unknown): Date | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return new Date(value.getTime() - VN_OFFSET_MS);
}

export function isZaloFriend(value: unknown): boolean {
  return (text(value) ?? "").toLowerCase().startsWith("đã kết bạn");
}

/** A numeric TELESALE cell is an amount, not a note. */
export function isNoteText(value: unknown): value is string {
  const cleaned = text(value);
  return Boolean(cleaned) && Number.isNaN(Number(cleaned));
}
