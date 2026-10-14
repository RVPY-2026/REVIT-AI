"use server";

import { revalidatePath } from "next/cache";
import { feedbackSchema, reportLessonSchema } from "@/lib/schemas/student-area";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { reportPlanLesson, insertFeedback, StudentAreaError } from "@/server/student-learning-record";
import type { ActionResult } from "@/server/result";

const MOCK_MESSAGE = "Chế độ xem thử chưa lưu thay đổi.";
const GENERIC_ERROR = "Chưa thể lưu lúc này. Bạn thử lại sau nhé.";

/** Report one of the caller's own lessons as done (or withdraw the report). */
export async function reportLesson(input: unknown): Promise<ActionResult<{ reported: boolean }>> {
  const parsed = reportLessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors };
  const user = await requirePermission("student-area.view");
  if (USE_MOCK) return { ok: false, error: MOCK_MESSAGE };
  try {
    const result = await db.transaction((tx) => reportPlanLesson(tx, user, parsed.data));
    revalidatePath("/hoc-vien", "layout");
    return { ok: true, data: { reported: result.reported } };
  } catch (error) {
    return { ok: false, error: error instanceof StudentAreaError ? error.message : GENERIC_ERROR };
  }
}

/** Course or add-in feedback from the signed-in student. */
export async function submitFeedback(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Thông tin chưa hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors };
  const user = await requirePermission("student-area.view");
  if (USE_MOCK) return { ok: false, error: MOCK_MESSAGE };
  try {
    const result = await db.transaction((tx) => insertFeedback(tx, user, parsed.data));
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof StudentAreaError ? error.message : GENERIC_ERROR };
  }
}
