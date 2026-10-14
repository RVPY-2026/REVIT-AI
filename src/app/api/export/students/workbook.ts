import "server-only";

import ExcelJS from "exceljs";
import { STUDENT_STATUS_META } from "@/lib/constants";
import type { StudentSummary } from "@/lib/schemas/student";

/** Build the full, already-filtered student export without applying pagination. */
export async function createStudentsWorkbook(rows: StudentSummary[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RVPY";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Học viên", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Mã học viên", key: "code", width: 16 },
    { header: "Họ và tên", key: "fullName", width: 28 },
    { header: "Số điện thoại", key: "phone", width: 18 },
    { header: "Email", key: "email", width: 30 },
    { header: "Trạng thái", key: "status", width: 18 },
    { header: "Mã nguồn", key: "sourceCode", width: 14 },
    { header: "Nguồn quảng cáo", key: "sourceName", width: 24 },
    { header: "Ngày đăng ký", key: "signedUpAt", width: 20 },
    { header: "Liên hệ gần nhất", key: "lastContactAt", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows.map((row) => ({
    code: row.code,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email ?? "",
    status: STUDENT_STATUS_META[row.status].label,
    sourceCode: row.sourceCode,
    sourceName: row.sourceName,
    signedUpAt: formatBusinessDateTime(row.signedUpAt),
    lastContactAt: row.lastContactAt ? formatBusinessDateTime(row.lastContactAt) : "Chưa liên hệ",
  })));
  sheet.autoFilter = { from: "A1", to: "I1" };
  const output = await workbook.xlsx.writeBuffer();
  return new Uint8Array(output as ArrayBuffer).buffer as ArrayBuffer;
}

function formatBusinessDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}
