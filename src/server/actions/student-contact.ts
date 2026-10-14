"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { saveStudentContactSchema, contactPatch, ContactConflictError } from "@/lib/schemas/student-contact";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { studentScope } from "@/server/auth/scope";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { students } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";

export async function updateStudentContact(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = saveStudentContactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Thông tin liên hệ chưa hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await requirePermission("students.edit");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi học viên." };

  try {
    const updated = await db.transaction(async (tx) => {
      const [student] = await tx.select({
        id: students.id,
        fullName: students.fullName,
        phone: students.phone,
        email: students.email,
      }).from(students)
        .where(and(eq(students.id, parsed.data.studentId), studentScope(user, "management")))
        .for("update")
        .limit(1);

      if (!student) return null;

      const patch = contactPatch(student, parsed.data);
      if (!Object.keys(patch).length) return { id: student.id };
      const [row] = await tx.update(students).set(patch)
        .where(and(eq(students.id, student.id), studentScope(user, "management"))).returning({ id: students.id });

      await audit(tx, {
        actorId: user.id,
        action: "student.contact_updated",
        entity: "students",
        entityId: student.id,
        data: {
          before: { fullName: student.fullName, phone: student.phone, email: student.email },
          after: { fullName: student.fullName, phone: student.phone, email: student.email, ...patch },
        },
      });
      return row;
    });

    if (!updated) return { ok: false, error: "Không tìm thấy học viên hoặc bạn không có quyền xem hồ sơ này." };

    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath(`/quan-tri/hoc-vien/${updated.id}`);
    revalidatePath("/quan-tri");
    return { ok: true, data: updated };
  } catch (error) {
    if (error instanceof ContactConflictError) return { ok: false, error: error.message };
    return { ok: false, error: "Chưa thể cập nhật thông tin học viên. Vui lòng thử lại." };
  }
}
