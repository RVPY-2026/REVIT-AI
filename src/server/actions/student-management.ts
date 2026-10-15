"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { archiveStudentSchema, restoreStudentSchema, transferStudentSchema } from "@/lib/schemas/student-management";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { studentScope } from "@/server/auth/scope";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { students, studentStatusEvents, adSources } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";

function refresh(id: string) {
  revalidatePath("/quan-tri/hoc-vien"); revalidatePath(`/quan-tri/hoc-vien/${id}`); revalidatePath("/quan-tri");
}

async function setArchive(input: unknown, restore: boolean): Promise<ActionResult<{ id: string }>> {
  const parsed = (restore ? restoreStudentSchema : archiveStudentSchema).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bạn chọn lý do và nhập ghi chú hợp lệ nhé." };
  const user = await requirePermission("students.archive");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi học viên." };
  const data = parsed.data;
  try {
    const result = await db.transaction(async tx => {
      const scope = and(eq(students.id, data.studentId), studentScope(user, "management"));
      const [row] = await tx.select({ id: students.id, status: students.status, archivedAt: students.archivedAt, reason: students.archiveReason })
        .from(students).where(scope).for("update").limit(1);
      if (!row) return { ok: false as const, error: "Không tìm thấy học viên." };
      if ((row.archivedAt?.toISOString() ?? null) !== data.expectedArchivedAt || Boolean(row.archivedAt) !== restore)
        return { ok: false as const, error: "Hồ sơ đã thay đổi. Bạn tải lại trang nhé." };
      const reason = "reason" in data ? data.reason : null;
      const note = "note" in data ? data.note : null;
      await tx.update(students).set({ archivedAt: restore ? null : new Date(), archiveReason: reason, archivedById: restore ? null : user.id }).where(scope);
      await tx.insert(studentStatusEvents).values({ studentId: row.id, fromStatus: row.status, toStatus: row.status,
        kind: restore ? "restore" : "archive", note, data: { reason: reason ?? row.reason ?? "" }, changedById: user.id });
      await audit(tx, { actorId: user.id, action: restore ? "student.restored" : "student.archived", entity: "students", entityId: row.id,
        data: { before: row.archivedAt?.toISOString() ?? null, reason, note } });
      return { ok: true as const, data: { id: row.id } };
    });
    if (result.ok) refresh(result.data.id);
    return result;
  } catch { return { ok: false, error: "Chưa thể cập nhật lưu trữ. Bạn thử lại sau nhé." }; }
}

export async function archiveStudent(input: unknown) { return setArchive(input, false); }
export async function restoreStudent(input: unknown) { return setArchive(input, true); }

export async function transferStudentSource(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = transferStudentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bạn chọn nguồn và nhập lý do chuyển nhé." };
  const user = await requirePermission("students.transfer");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi học viên." };
  const data = parsed.data;
  try {
    const result = await db.transaction(async tx => {
      const scope = and(eq(students.id, data.studentId), studentScope(user, "management"));
      const [row] = await tx.select({ id: students.id, status: students.status, sourceId: students.sourceId, archivedAt: students.archivedAt })
        .from(students).where(scope).for("update").limit(1);
      if (!row || row.archivedAt) return { ok: false as const, error: "Hồ sơ không khả dụng. Bạn khôi phục hồ sơ trước khi sửa nhé." };
      if (row.sourceId !== data.expectedSourceId) return { ok: false as const, error: "Nguồn đã thay đổi. Bạn tải lại trang nhé." };
      const [source] = await tx.select({ id: adSources.id }).from(adSources).where(and(eq(adSources.id, data.sourceId), eq(adSources.active, true))).for("share").limit(1);
      if (!source) return { ok: false as const, error: "Nguồn đích chưa hoạt động." };
      if (row.sourceId === data.sourceId) return { ok: true as const, data: { id: row.id } };
      // Codes and allocator counters are immutable; transfer changes current ownership only.
      await tx.update(students).set({ sourceId: data.sourceId }).where(scope);
      const change = { before: row.sourceId, after: data.sourceId };
      await tx.insert(studentStatusEvents).values({ studentId: row.id, fromStatus: row.status, toStatus: row.status,
        kind: "source_transfer", data: change, note: data.reason, changedById: user.id });
      await audit(tx, { actorId: user.id, action: "student.source_transferred", entity: "students", entityId: row.id, data: { ...change, reason: data.reason } });
      return { ok: true as const, data: { id: row.id } };
    });
    if (result.ok) refresh(result.data.id);
    return result;
  } catch { return { ok: false, error: "Chưa thể chuyển nguồn. Bạn thử lại sau nhé." }; }
}
