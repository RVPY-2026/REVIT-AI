"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { studentNoteSchema, editStudentNoteSchema } from "@/lib/schemas/student-note";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { studentScope } from "@/server/auth/scope";
import { callNotes, students } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";
import { canCorrectContactNote } from "@/lib/contact-note";

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
        .where(and(eq(students.id, parsed.data.studentId), studentScope(user, "management"), isNull(students.archivedAt)))
        .for("update")
        .limit(1);

      if (!student) return null;

      const [note] = await tx.insert(callNotes)
        .values({ studentId: student.id, body: parsed.data.body, authorId: user.id, channel: parsed.data.channel,
          outcome: parsed.data.outcome, nextActionAt: parsed.data.nextActionAt ? new Date(parsed.data.nextActionAt) : null })
        .returning({ id: callNotes.id });

      await audit(tx, {
        actorId: user.id,
        action: "student.call_note_added",
        entity: "call_notes",
        entityId: note.id,
        data: { studentId: student.id, channel: parsed.data.channel, outcome: parsed.data.outcome, nextActionAt: parsed.data.nextActionAt },
      });

      return note.id;
    });

    if (!noteId) return { ok: false, error: "Không tìm thấy học viên hoặc bạn không có quyền xem hồ sơ này." };

    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath(`/quan-tri/hoc-vien/${parsed.data.studentId}`);
    revalidatePath("/quan-tri");
    return { ok: true, data: { id: noteId } };
  } catch {
    return { ok: false, error: "Chưa thể lưu ghi chú. Vui lòng thử lại." };
  }
}

/** Body-only correction by the author; the original contact time and schedule stay fixed. */
export async function editCallNote(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = editStudentNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin ghi chú chưa hợp lệ." };
  const user = await requirePermission("students.edit");
  if (USE_MOCK) return { ok: false, error: "Chức năng ghi chú chưa khả dụng trong chế độ xem thử." };
  const data = parsed.data;
  try {
    const [{ db }, { audit }] = await Promise.all([import("@/server/db"), import("@/server/audit")]);
    const result = await db.transaction(async tx => {
      const [student] = await tx.select({ id: students.id }).from(students)
        .where(and(eq(students.id, data.studentId), studentScope(user, "management"), isNull(students.archivedAt))).for("update").limit(1);
      if (!student) return { ok: false as const, error: "Hồ sơ không khả dụng. Bạn khôi phục trước khi ghi chú nhé." };
      const [note] = await tx.select({ id: callNotes.id, authorId: callNotes.authorId, body: callNotes.body, createdAt: callNotes.createdAt })
        .from(callNotes).where(and(eq(callNotes.id, data.noteId), eq(callNotes.studentId, student.id))).for("update").limit(1);
      if (!note || !canCorrectContactNote(note.createdAt, note.authorId, user.id))
        return { ok: false as const, error: "Chỉ người viết được sửa ghi chú trong 15 phút đầu." };
      if (note.body !== data.expectedBody) return { ok: false as const, error: "Ghi chú đã thay đổi. Bạn tải lại trang nhé." };
      await tx.update(callNotes).set({ body: data.body, editedAt: new Date() }).where(eq(callNotes.id, note.id));
      await audit(tx, { actorId: user.id, action: "student.call_note_edited", entity: "call_notes", entityId: note.id,
        data: { studentId: student.id, before: note.body, after: data.body } });
      return { ok: true as const, data: { id: note.id } };
    });
    if (result.ok) { revalidatePath("/quan-tri/hoc-vien"); revalidatePath(`/quan-tri/hoc-vien/${data.studentId}`); revalidatePath("/quan-tri"); }
    return result;
  } catch { return { ok: false, error: "Chưa thể sửa ghi chú. Bạn thử lại sau nhé." }; }
}
