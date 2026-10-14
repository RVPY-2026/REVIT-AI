"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { studentNoteSchema } from "@/lib/schemas/student-note";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { studentScope } from "@/server/auth/scope";
import { callNotes, students } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";

export async function addCallNote(input: unknown): Promise<ActionResult<{ id: string }>> {
  if (USE_MOCK) {
    await requirePermission("students.edit");
    return { ok: false, error: "Chức năng ghi chú chưa khả dụng trong chế độ xem thử." };
  }

  const parsed = studentNoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Thông tin ghi chú chưa hợp lệ.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await requirePermission("students.edit");

  try {
    const [{ db }, { audit }] = await Promise.all([
      import("@/server/db"),
      import("@/server/audit"),
    ]);
    const noteId = await db.transaction(async (tx) => {
      const [student] = await tx.select({ id: students.id })
        .from(students)
        .where(and(eq(students.id, parsed.data.studentId), studentScope(user, "management")))
        .for("update")
        .limit(1);

      if (!student) return null;

      const [note] = await tx.insert(callNotes)
        .values({ studentId: student.id, body: parsed.data.body, authorId: user.id })
        .returning({ id: callNotes.id });

      await audit(tx, {
        actorId: user.id,
        action: "student.call_note_added",
        entity: "call_notes",
        entityId: note.id,
        data: { studentId: student.id },
      });

      return note.id;
    });

    if (!noteId) return { ok: false, error: "Không tìm thấy học viên hoặc bạn không có quyền xem hồ sơ này." };

    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath(`/quan-tri/hoc-vien/${parsed.data.studentId}`);
    return { ok: true, data: { id: noteId } };
  } catch {
    return { ok: false, error: "Chưa thể lưu ghi chú. Vui lòng thử lại." };
  }
}
