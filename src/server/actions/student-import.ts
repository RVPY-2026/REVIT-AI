"use server";

import { revalidatePath } from "next/cache";
import type { ImportOutcome, ImportSummary } from "@/lib/schemas/student-import";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { MAX_IMPORT_BYTES, SheetFormatError, applyStudentImport, parseStudentSheet, planStudentImport, type ImportPlan } from "@/server/import/student-sheet";
import type { ActionResult } from "@/server/result";

const SAMPLE = 12;

async function plan(formData: FormData): Promise<{ plan: ImportPlan } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Bạn chọn file .xlsx cần nhập." };
  if (file.size > MAX_IMPORT_BYTES) return { error: "File quá lớn (tối đa 4 MB)." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "Chỉ nhận file .xlsx xuất từ Google Sheet." };
  const data = await file.arrayBuffer();
  // .xlsx is a zip archive; reject anything else before the parser sees it.
  if (new Uint8Array(data.slice(0, 2)).join() !== "80,75") return { error: "File không phải định dạng .xlsx." };
  try { return { plan: await planStudentImport(await parseStudentSheet(data)) }; }
  catch (error) { return { error: error instanceof SheetFormatError ? error.message : "Chưa thể đọc file. Bạn thử lại hoặc kiểm tra định dạng." }; }
}

function summarize({ parse, newRows, existingCount, changes, missingSources }: ImportPlan): ImportSummary {
  const newByStatus: ImportSummary["newByStatus"] = {};
  for (const row of newRows) newByStatus[row.status] = (newByStatus[row.status] ?? 0) + 1;
  const follow = changes.filter((change) => change.statusChange);
  const conflict = changes.filter((change) => change.statusConflict);
  return {
    newCount: newRows.length, newByStatus,
    newSample: newRows.slice(0, SAMPLE).map((row) => ({ code: row.code, fullName: row.fullName, status: row.status })),
    existingCount, withChanges: changes.length,
    fillCount: changes.filter((change) => Object.keys(change.fill).length).length,
    newNotes: changes.filter((change) => change.newNote).length,
    statusFollow: { count: follow.length, sample: follow.slice(0, SAMPLE).map((c) => ({ code: c.code, fullName: c.fullName, from: c.statusChange!.from, to: c.statusChange!.to })) },
    statusConflict: { count: conflict.length, sample: conflict.slice(0, SAMPLE).map((c) => ({ code: c.code, fullName: c.fullName, site: c.statusConflict!.site, sheet: c.statusConflict!.sheet })) },
    missingSources,
    problems: { badCode: parse.issues.badCode, badPhone: parse.issues.badPhone, unknownStatus: parse.issues.unknownStatus, duplicateCode: parse.issues.duplicateCode, badEmail: parse.issues.badEmail, blank: parse.issues.blank },
  };
}

/** Step 1: read the file and report what would change. Writes nothing. */
export async function previewStudentImport(formData: FormData): Promise<ActionResult<ImportSummary>> {
  await requirePermission("students.import");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử không đọc được dữ liệu thật." };
  const planned = await plan(formData);
  if ("error" in planned) return { ok: false, error: planned.error };
  return { ok: true, data: summarize(planned.plan) };
}

/** Step 2: read the same file again (so the plan is current) and write it. */
export async function commitStudentImport(formData: FormData): Promise<ActionResult<ImportOutcome>> {
  const user = await requirePermission("students.import");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu dữ liệu." };
  const planned = await plan(formData);
  if ("error" in planned) return { ok: false, error: planned.error };
  try {
    const outcome = await applyStudentImport(planned.plan, user.id, formData.get("updateExisting") === "on");
    revalidatePath("/quan-tri", "layout");
    return { ok: true, data: outcome };
  } catch {
    return { ok: false, error: "Chưa thể nhập dữ liệu. Chưa có thay đổi nào được lưu, bạn thử lại nhé." };
  }
}
