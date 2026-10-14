import { NextResponse } from "next/server";
import { studentFilterSchema, studentIdSchema } from "@/lib/schemas/student";
import { USE_MOCK } from "@/lib/runtime-mode";
import { z } from "zod";
import { exportStudents } from "@/lib/api/students";
import { requirePermission } from "@/server/auth/session";
import { createStudentsWorkbook } from "./workbook";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request) {
  await requirePermission("students.export");

  const params = new URL(request.url).searchParams;
  const rawFilter: Record<string, string> = {};
  // `ids` narrows the export to selected rows; it is checked below and still runs through the scoped query.
  const idsParam = params.get("ids");
  const ids = idsParam ? idsParam.split(",") : null;
  if (ids && (ids.length > 100 || !ids.every((id) => studentIdSchema.safeParse(id).success))) {
    return NextResponse.json({ error: "Danh sách học viên chưa hợp lệ." }, { status: 400 });
  }
  for (const [key, value] of params) {
    if (key === "ids") continue;
    if (Object.hasOwn(rawFilter, key)) return NextResponse.json({ error: "Bộ lọc chưa hợp lệ." }, { status: 400 });
    rawFilter[key] = value;
  }

  const parsed = studentFilterSchema.safeParse(rawFilter);
  if (!parsed.success) return NextResponse.json({ error: "Bộ lọc chưa hợp lệ." }, { status: 400 });
  if (!USE_MOCK && parsed.data.sourceId && !z.uuid().safeParse(parsed.data.sourceId).success) {
    return NextResponse.json({ error: "Bộ lọc chưa hợp lệ." }, { status: 400 });
  }

  const all = await exportStudents(parsed.data);
  const rows = ids ? all.filter((row) => ids.includes(row.id)) : all;
  const buffer = await createStudentsWorkbook(rows);
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const datePart = (type: "year" | "month" | "day") => dateParts.find((part) => part.type === type)?.value ?? "";
  const fileDate = `${datePart("year")}${datePart("month")}${datePart("day")}`;

  return new Response(buffer, {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="rvpy-students-${fileDate}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
