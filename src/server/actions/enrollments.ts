"use server";

import { revalidatePath } from "next/cache";
import { kanbanStageSchema, trialEnrollmentSchema, formalEnrollmentSchema } from "@/lib/schemas/enrollment";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { changeKanbanStage, enrollStudent, EnrollmentError } from "@/server/enrollment-record";
import type { ActionResult } from "@/server/result";
import type { z } from "zod";
import type { Permission, SessionUser } from "@/lib/auth/permissions";

async function mutate<T>(schema: z.ZodType<T>, input: unknown, permission: Permission,
  operation: (user: SessionUser, data: T) => Promise<{ id: string }>): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ." };
  const user = await requirePermission(permission);
  try {
    const data = await operation(user, parsed.data);
    revalidatePath("/quan-tri/hoc-vien");
    revalidatePath(`/quan-tri/hoc-vien/${data.id}`);
    revalidatePath("/hoc-vien", "layout");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof EnrollmentError ? error.message : "Chưa thể cập nhật học viên. Bạn thử lại sau nhé." };
  }
}

export async function updateKanbanStage(input: unknown) {
  return mutate(kanbanStageSchema, input, "students.edit", (user, data) => db.transaction((tx) => changeKanbanStage(tx, user, data.studentId, data.status)));
}
export async function openTrialEnrollment(input: unknown) {
  return mutate(trialEnrollmentSchema, input, "enrollments.trial", (user, data) => db.transaction((tx) => enrollStudent(tx, user, data.studentId)));
}
export async function activateFormalEnrollment(input: unknown) {
  return mutate(formalEnrollmentSchema, input, "enrollments.formal", (user, data) => db.transaction((tx) => enrollStudent(tx, user, data.studentId, data)));
}
