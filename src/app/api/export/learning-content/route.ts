import ExcelJS from "exceljs";
import { z } from "zod";
import { getLearningContent } from "@/lib/api/learning-content";
import { AUDIENCE_LABELS, PHASE_LABELS } from "@/lib/learning-content";
import { businessDateString } from "@/lib/student-learning";
import { requirePermission } from "@/server/auth/session";

const filterSchema = z.object({ domain: z.enum(["resources", "lessons"]), search: z.string().max(200).default(""), audience: z.enum(["any", "trial", "formal", "all"]).default("any"), lesson: z.union([z.uuid(), z.enum(["any", "none"])]).default("any"), sort: z.enum(["order", "title"]).default("order") }).strict();
export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain");
  await requirePermission(domain === "lessons" ? "lessons.manage" : "resources.manage");
  const parsed = filterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Bộ lọc chưa hợp lệ. Bạn chọn lại bộ lọc nhé." }, { status: 400 });
  const filter = parsed.data; const data = await getLearningContent(filter.domain);
  const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet(filter.domain === "lessons" ? "Chương trình học" : "Tài liệu");
  sheet.columns = (filter.domain === "lessons" ? ["Giai đoạn", "Số bài", "Tên bài học", "Số ngày", "Học thử", "Đang dùng", "Số tài liệu", "Số kế hoạch"] : ["Bài học", "Tên tài liệu", "Đối tượng", "Cách sử dụng", "Đang dùng", "Tên tệp", "Dung lượng (byte)"]).map((header, index) => ({ header, key: `column${index}`, width: 24 }));
  const addRow = (values: unknown[]) => sheet.addRow(Object.fromEntries(values.map((value, index) => [`column${index}`, value])));
  const matching = <T extends { title: string }>(rows: T[]) => {
    const filtered = rows.filter((r) => r.title.toLocaleLowerCase("vi").includes(filter.search.toLocaleLowerCase("vi")));
    return filter.sort === "title" ? filtered.sort((a, b) => a.title.localeCompare(b.title, "vi")) : filtered;
  };
  if (filter.domain === "lessons") for (const l of matching(data.lessons)) addRow([PHASE_LABELS[l.phase], l.lessonNumbers.join("/"), l.title, l.baseDays, l.trialOrder, l.active ? "Có" : "Không", l.resourceCount, l.planCount]);
  else for (const r of matching(data.resources.filter((r) => (filter.audience === "any" || r.audience === filter.audience) && (filter.lesson === "any" || (filter.lesson === "none" ? r.lessonId === null : r.lessonId === filter.lesson))))) addRow([data.lessons.find((l) => l.id === r.lessonId)?.title ?? "Không gắn bài học", r.title, AUDIENCE_LABELS[r.audience], r.mode === "view" ? "Chỉ xem" : "Cho tải", r.active ? "Có" : "Không", r.filename, r.size]);
  sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="rvpy-${filter.domain}-${businessDateString(new Date()).replaceAll("-", "")}.xlsx"`, "Cache-Control": "private, no-store" } });
}
