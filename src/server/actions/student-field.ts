"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { normalizeStudentField, studentChangeKey, updateStudentFieldSchema, updateStudentProfileSchema } from "@/lib/schemas/student-field";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { studentScope } from "@/server/auth/scope";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { students } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";
import { DuplicatePhoneError, requirePhoneAcknowledgment } from "@/server/phone-matches";

/** Patch a single allowed field, preserving edits made in other cells. */
export async function updateStudentField(input: unknown): Promise<ActionResult<{ value: string }>> {
  const parsed = updateStudentFieldSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors };
  const user = await requirePermission("students.edit");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi học viên." };
  const data = parsed.data;
  try {
    const result = await db.transaction(async (tx) => {
      const scope = and(eq(students.id, data.studentId), studentScope(user, "management"), isNull(students.archivedAt));
      const [row] = await tx.select({ id: students.id, fullName: students.fullName, phone: students.phone,
        email: students.email, occupation: students.occupation, birthYear: students.birthYear,
        specialty: students.specialty, hometown: students.hometown, organization: students.organization,
        zaloName: students.zaloName, signupAnswers: students.signupAnswers })
        .from(students).where(scope).for("update").limit(1);
      if (!row) return { ok: false as const, error: "Không tìm thấy học viên hoặc bạn không có quyền xem hồ sơ này." };
      if (data.field === "signupAnswer" && !Object.hasOwn(row.signupAnswers, data.answerKey!)) {
        return { ok: false as const, error: "Không tìm thấy câu trả lời cần sửa. Bạn tải lại hồ sơ nhé." };
      }
      const before = data.field === "signupAnswer" ? row.signupAnswers[data.answerKey!] : row[data.field];
      if (String(before ?? "") !== data.expectedValue) return { ok: false as const, error: "Thông tin đã được cập nhật ở nơi khác. Bạn tải lại trang trước khi sửa." };
      const value = normalizeStudentField(data.field, data.value);
      if (String(value ?? "") === String(before ?? "")) return { ok: true as const, data: { value: String(value ?? "") } };
      if (data.field === "phone") await requirePhoneAcknowledgment(tx, user, String(value), data.duplicateAcknowledged, row.id);
      const patch = data.field === "signupAnswer"
        ? { signupAnswers: { ...row.signupAnswers, [data.answerKey!]: String(value ?? "") } }
        : { [data.field]: value };
      const [updated] = await tx.update(students).set(patch).where(scope).returning({ id: students.id });
      if (!updated) throw new Error("Student scope changed during field edit");
      await audit(tx, { actorId: user.id, action: "student.field_updated", entity: "students", entityId: row.id,
        data: { field: data.field, answerKey: data.answerKey, before, after: value, ...(data.field === "phone" && data.duplicateAcknowledged ? { duplicateAcknowledged: true } : {}) } });
      return { ok: true as const, data: { value: String(value ?? "") } };
    });
    if (result.ok) {
      revalidatePath("/quan-tri/hoc-vien");
      revalidatePath(`/quan-tri/hoc-vien/${data.studentId}`);
      revalidatePath("/quan-tri");
    }
    return result;
  } catch (error) {
    if (error instanceof DuplicatePhoneError) return { ok: false, error: error.message };
    return { ok: false, error: "Chưa thể lưu thông tin. Bạn thử lại sau nhé." };
  }
}

/** Save every edited field of one profile together: all succeed or none are written. */
export async function updateStudentProfile(input: unknown): Promise<ActionResult<{ values: Record<string, string> }>> {
  const batch = updateStudentProfileSchema.safeParse(input);
  if (!batch.success) return { ok: false, error: "Thông tin chưa hợp lệ." };
  const user = await requirePermission("students.edit");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi học viên." };
  const { studentId, changes } = batch.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const change of changes) {
    const checked = updateStudentFieldSchema.safeParse({ studentId, ...change });
    if (!checked.success) fieldErrors[studentChangeKey(change)] = [checked.error.issues[0]?.message ?? "Giá trị chưa hợp lệ."];
  }
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Có thông tin chưa hợp lệ. Bạn kiểm tra các ô báo đỏ.", fieldErrors };
  try {
    const result = await db.transaction(async (tx) => {
      const scope = and(eq(students.id, studentId), studentScope(user, "management"), isNull(students.archivedAt));
      const [row] = await tx.select({ id: students.id, fullName: students.fullName, phone: students.phone,
        email: students.email, occupation: students.occupation, birthYear: students.birthYear,
        specialty: students.specialty, hometown: students.hometown, organization: students.organization,
        zaloName: students.zaloName, signupAnswers: students.signupAnswers })
        .from(students).where(scope).for("update").limit(1);
      if (!row) return { ok: false as const, error: "Không tìm thấy học viên hoặc bạn không có quyền xem hồ sơ này." };
      const patch: Record<string, unknown> = {};
      const answers = { ...row.signupAnswers };
      const values: Record<string, string> = {};
      const audits: { field: string; answerKey?: string; before: unknown; after: unknown }[] = [];
      for (const change of changes) {
        const isAnswer = change.field === "signupAnswer";
        if (isAnswer && !Object.hasOwn(answers, change.answerKey!)) return { ok: false as const, error: "Không tìm thấy câu trả lời cần sửa. Bạn tải lại hồ sơ nhé." };
        const before = isAnswer ? answers[change.answerKey!] : row[change.field as keyof typeof row];
        if (String(before ?? "") !== change.expectedValue) return { ok: false as const, error: "Hồ sơ đã được cập nhật ở nơi khác. Bạn tải lại trang trước khi sửa." };
        const value = normalizeStudentField(change.field, change.value);
        values[studentChangeKey(change)] = String(value ?? "");
        if (String(value ?? "") === String(before ?? "")) continue;
        if (change.field === "phone") await requirePhoneAcknowledgment(tx, user, String(value), batch.data.duplicateAcknowledged, row.id);
        if (isAnswer) answers[change.answerKey!] = String(value ?? "");
        else patch[change.field] = value;
        audits.push({ field: change.field, answerKey: change.answerKey, before, after: value });
      }
      if (audits.some((item) => item.field === "signupAnswer")) patch.signupAnswers = answers;
      if (audits.length) {
        const [updated] = await tx.update(students).set(patch).where(scope).returning({ id: students.id });
        if (!updated) throw new Error("Student scope changed during profile edit");
        for (const item of audits) {
          await audit(tx, { actorId: user.id, action: "student.field_updated", entity: "students", entityId: row.id, data: { ...item, ...(item.field === "phone" && batch.data.duplicateAcknowledged ? { duplicateAcknowledged: true } : {}) } });
        }
      }
      return { ok: true as const, data: { values } };
    });
    if (result.ok) {
      revalidatePath("/quan-tri/hoc-vien");
      revalidatePath(`/quan-tri/hoc-vien/${studentId}`);
      revalidatePath("/quan-tri");
    }
    return result;
  } catch (error) {
    if (error instanceof DuplicatePhoneError) return { ok: false, error: error.message };
    return { ok: false, error: "Chưa thể lưu thông tin. Bạn thử lại sau nhé." };
  }
}
