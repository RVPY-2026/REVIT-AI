"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deleteStudentPermanentlySchema } from "@/lib/schemas/student-management";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { studentScope } from "@/server/auth/scope";
import type { ActionResult } from "@/server/result";

export async function deleteStudentPermanently(input: unknown): Promise<ActionResult<{ code: string }>> {
  const parsed = deleteStudentPermanentlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bạn nhập đúng mã học viên và lý do xóa nhé." };
  const user = await requirePermission("students.delete");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa xóa hồ sơ." };
  const data = parsed.data;
  try {
    const [{ db }, { audit }, schema, { studentDeletionBlockers }] = await Promise.all([
      import("@/server/db"), import("@/server/audit"), import("@/server/db/schema"), import("@/server/student-deletion"),
    ]);
    const { students, adSources, deletedStudentCodes, callNotes, studentStatusEvents, leadSignupSessions } = schema;
    const result = await db.transaction(async tx => {
      const scope = and(eq(students.id, data.studentId), studentScope(user, "management"));
      const [row] = await tx.select({ id: students.id, code: students.code, sourceId: students.sourceId, codeMonth: students.codeMonth,
        seq: students.seq, status: students.status, archiveReason: students.archiveReason, archivedAt: students.archivedAt,
        userId: students.userId, signedUpAt: students.signedUpAt }).from(students).where(scope).for("update").limit(1);
      if (!row) return { ok: false as const, error: "Không tìm thấy học viên." };
      if (row.code !== data.confirmationCode || row.archivedAt?.toISOString() !== data.expectedArchivedAt)
        return { ok: false as const, error: "Mã hoặc trạng thái lưu trữ đã thay đổi. Bạn tải lại hồ sơ nhé." };
      const blockers = await studentDeletionBlockers(tx, user, row);
      if (blockers.length) return { ok: false as const, error: blockers.join(" ") };
      const [source] = await tx.select({ code: adSources.code }).from(adSources).where(eq(adSources.id, row.sourceId)).for("share").limit(1);
      await tx.insert(deletedStudentCodes).values({ code: row.code, sourceId: row.sourceId, codeMonth: row.codeMonth,
        seq: row.seq, deletedById: user.id, reason: data.reason });
      await tx.delete(callNotes).where(eq(callNotes.studentId, row.id));
      await tx.delete(studentStatusEvents).where(eq(studentStatusEvents.studentId, row.id));
      await tx.delete(leadSignupSessions).where(eq(leadSignupSessions.studentId, row.id));
      await tx.delete(students).where(scope);
      await audit(tx, { actorId: user.id, action: "student.permanently_deleted", entity: "students", entityId: row.id,
        data: { code: row.code, sourceCode: source.code, status: row.status, archiveReason: row.archiveReason, signedUpAt: row.signedUpAt.toISOString() } });
      return { ok: true as const, data: { code: row.code } };
    });
    if (result.ok) { revalidatePath("/quan-tri/hoc-vien"); revalidatePath(`/quan-tri/hoc-vien/${data.studentId}`); revalidatePath("/quan-tri"); }
    return result;
  } catch { return { ok: false, error: "Chưa thể xóa hồ sơ. Dữ liệu có thể vừa thay đổi; bạn tải lại và kiểm tra điều kiện nhé." }; }
}
