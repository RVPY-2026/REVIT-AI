"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bulkUpdateStudentStatusSchema, updateStudentStatusSchema } from "@/lib/schemas/student-status";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { studentScope } from "@/server/auth/scope";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { students, studentStatusEvents } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";

/** Manual CRM classification never grants access or changes enrollment/financial records. */
export async function updateStudentStatus(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = updateStudentStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Trạng thái chưa hợp lệ." };
  const user = await requirePermission("students.edit");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi học viên." };
  try {
    const updated = await db.transaction(async (tx) => {
      const scope = and(eq(students.id, parsed.data.studentId), studentScope(user, "management"));
      const [student] = await tx.select({ id: students.id, status: students.status })
        .from(students).where(scope).for("update").limit(1);
      if (!student) return null;
      if (parsed.data.expectedStatus && parsed.data.expectedStatus !== student.status) {
        return { id: student.id, conflict: true as const };
      }
      if (student.status === parsed.data.status) return { id: student.id };
      const [row] = await tx.update(students).set({ status: parsed.data.status })
        .where(scope).returning({ id: students.id });
      if (!row) throw new Error("Student scope changed during status edit");
      await tx.insert(studentStatusEvents).values({
        studentId: student.id, fromStatus: student.status, toStatus: parsed.data.status,
        changedById: user.id,
      });
      await audit(tx, { actorId: user.id, action: "student.status_edited", entity: "students",
        entityId: student.id, data: { before: student.status, after: parsed.data.status } });
      return row;
    });
    if (!updated) return { ok: false, error: "Không tìm thấy học viên hoặc bạn không có quyền xem hồ sơ này." };
    if ("conflict" in updated) return { ok: false, error: "Trạng thái đã thay đổi ở nơi khác. Bạn tải lại trang trước khi sửa." };
    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath(`/quan-tri/hoc-vien/${updated.id}`);
    revalidatePath("/quan-tri");
    return { ok: true, data: updated };
  } catch {
    return { ok: false, error: "Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé." };
  }
}

/** Reclassify several selected leads in one transaction; each change gets its own history row. */
export async function bulkUpdateStudentStatus(input: unknown): Promise<ActionResult<{ updated: number }>> {
  const parsed = bulkUpdateStudentStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Danh sách học viên chưa hợp lệ." };
  const user = await requirePermission("students.edit");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi học viên." };
  const { studentIds, status } = parsed.data;
  try {
    const updated = await db.transaction(async (tx) => {
      const scope = and(inArray(students.id, studentIds), studentScope(user, "management"));
      const current = await tx.select({ id: students.id, status: students.status })
        .from(students).where(scope).for("update");
      const changing = current.filter((student) => student.status !== status);
      for (const student of changing) {
        await tx.update(students).set({ status }).where(eq(students.id, student.id));
        await tx.insert(studentStatusEvents).values({
          studentId: student.id, fromStatus: student.status, toStatus: status, changedById: user.id,
        });
        await audit(tx, { actorId: user.id, action: "student.status_edited", entity: "students",
          entityId: student.id, data: { before: student.status, after: status, bulk: true } });
      }
      return changing.length;
    });
    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath("/quan-tri");
    return { ok: true, data: { updated } };
  } catch {
    return { ok: false, error: "Chưa thể cập nhật trạng thái. Bạn thử lại sau nhé." };
  }
}
