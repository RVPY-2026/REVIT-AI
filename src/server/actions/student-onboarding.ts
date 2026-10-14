"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import type { Permission, SessionUser } from "@/lib/auth/permissions";
import { activateStudentSchema, checklistSchema, confirmTrialLessonSchema, retryZaloMessagesSchema } from "@/lib/schemas/student-onboarding";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import type { ActionResult } from "@/server/result";
import { activateStudentAccount, setStudentChecklist, confirmStudentTrialLesson, retryStudentZaloMessages, OnboardingError } from "@/server/student-onboarding-record";
import { drainZaloOutbox } from "@/server/zalo/outbox";

async function mutate<T>(schema: z.ZodType<T>, input: unknown, permission: Permission,
  operation: (user: SessionUser, data: T) => Promise<{ id: string }>): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ. Bạn kiểm tra lại nhé." };
  const user = await requirePermission(permission);
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi." };
  try {
    const data = await operation(user, parsed.data);
    revalidatePath("/quan-tri", "layout");
    revalidatePath("/hoc-vien", "layout");
    revalidatePath("/tai-khoan");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof OnboardingError ? error.message : "Chưa thể lưu. Bạn thử lại sau nhé." };
  }
}

export async function activateStudent(input: unknown) {
  return mutate(activateStudentSchema, input, "students.activate", (user, data) => db.transaction((tx) => activateStudentAccount(tx, user, data)));
}
export async function updateStudentChecklist(input: unknown) {
  return mutate(checklistSchema, input, "students.learning.edit", (user, data) => db.transaction((tx) => setStudentChecklist(tx, user, data)));
}
export async function confirmTrialLesson(input: unknown) {
  return mutate(confirmTrialLessonSchema, input, "students.learning.edit", (user, data) => db.transaction((tx) => confirmStudentTrialLesson(tx, user, data)));
}
export async function retryZaloMessages(input: unknown) {
  const result = await mutate(retryZaloMessagesSchema, input, "students.learning.edit", (user, data) =>
    db.transaction((tx) => retryStudentZaloMessages(tx, user, data.studentId)));
  if (result.ok) await drainZaloOutbox(10).catch(() => undefined);
  return result;
}
