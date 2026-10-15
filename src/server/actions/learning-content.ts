"use server";

import { cleanupLearningUploads } from "@/server/learning-upload-cleanup";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import {
  resourceObjectPath,
  RESOURCE_BUCKET,
} from "@/server/learning-upload-config";
import {
  idSchema,
  lessonSchema,
  resourceSchema,
  reorderSchema,
  toggleSchema,
  trialSwapSchema,
  uploadSchema,
  confirmLessonSchema,
  bulkConfirmSchema,
} from "@/lib/schemas/learning-content";
import type { Permission, SessionUser } from "@/lib/auth/permissions";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { learningUploads } from "@/server/db/schema";
import { audit } from "@/server/audit";
import type { ActionResult } from "@/server/result";
import {
  deleteResourceRecord,
  LearningContentError,
  reorderContent,
  saveLessonRecord,
  saveResourceRecord,
  swapTrialRecords,
  toggleContent,
  type LearningTx,
} from "@/server/learning-content-record";
import {
  confirmStudentLesson,
  OnboardingError,
} from "@/server/student-onboarding-record";
import {
  removeLearningObject,
  ensureLearningBucket,
  signLearningUpload,
  learningObjectInfo,
} from "@/server/learning-storage";

async function mutate<T, R>(
  schema: z.ZodType<T>,
  input: unknown,
  permission: Permission,
  operation: (tx: LearningTx, user: SessionUser, data: T) => Promise<R>,
): Promise<ActionResult<R>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message.startsWith("Bạn")
        ? parsed.error.issues[0].message
        : "Thông tin chưa hợp lệ. Bạn kiểm tra lại nhé.",
    };
  const user = await requirePermission(permission);
  if (USE_MOCK)
    return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi." };
  try {
    const data = await db.transaction((tx) => operation(tx, user, parsed.data));
    revalidatePath("/quan-tri/tai-lieu");
    revalidatePath("/quan-tri/chuong-trinh");
    revalidatePath("/hoc-vien", "layout");
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof LearningContentError ||
        error instanceof OnboardingError
          ? error.message
          : "Chưa thể lưu. Bạn kiểm tra kết nối và thử lại nhé.",
    };
  }
}
export async function saveLesson(input: unknown) {
  return mutate(lessonSchema, input, "lessons.manage", saveLessonRecord);
}
export async function swapTrialLessons(input: unknown) {
  return mutate(trialSwapSchema, input, "lessons.manage", swapTrialRecords);
}
export async function reorderLessons(input: unknown) {
  return mutate(reorderSchema, input, "lessons.manage", (tx, user, data) =>
    reorderContent(tx, user, "lessons", data),
  );
}
export async function reorderResources(input: unknown) {
  return mutate(reorderSchema, input, "resources.manage", (tx, user, data) =>
    reorderContent(tx, user, "resources", data),
  );
}
export async function toggleLesson(input: unknown) {
  return mutate(toggleSchema, input, "lessons.manage", (tx, user, data) =>
    toggleContent(tx, user, "lessons", data),
  );
}
export async function toggleResource(input: unknown) {
  return mutate(toggleSchema, input, "resources.manage", (tx, user, data) =>
    toggleContent(tx, user, "resources", data),
  );
}
export async function saveResource(
  input: unknown,
): Promise<ActionResult<{ id: string; cleanupPending: boolean }>> {
  const result = await mutate(
    resourceSchema,
    input,
    "resources.manage",
    saveResourceRecord,
  );
  if (!result.ok) return result;
  const cleaned = await removeLearningObject(result.data.cleanup);
  return { ok: true, data: { id: result.data.id, cleanupPending: !cleaned } };
}
export async function deleteResource(
  input: unknown,
): Promise<ActionResult<{ id: string; cleanupPending: boolean }>> {
  const result = await mutate(
    idSchema,
    input,
    "resources.manage",
    (tx, user, data) => deleteResourceRecord(tx, user, data.id),
  );
  if (!result.ok) return result;
  const cleaned = await removeLearningObject(result.data.cleanup);
  return { ok: true, data: { id: result.data.id, cleanupPending: !cleaned } };
}
export async function prepareResourceUpload(
  input: unknown,
): Promise<
  ActionResult<{
    id: string;
    filename: string;
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
  }>
> {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message.startsWith("Bạn")
        ? parsed.error.issues[0].message
        : "Thông tin tệp chưa hợp lệ. Bạn chọn lại tệp nhé.",
    };
  const user = await requirePermission("resources.manage");
  if (USE_MOCK)
    return { ok: false as const, error: "Chế độ xem thử chưa lưu thay đổi." };
  try {
    await cleanupLearningUploads(user.id);
    await ensureLearningBucket();
  } catch {
    return {
      ok: false as const,
      error: "Chưa mở được nơi lưu tệp. Bạn kiểm tra cấu hình lưu trữ nhé.",
    };
  }
  return mutate(
    uploadSchema,
    parsed.data,
    "resources.manage",
    async (tx, caller, data) => {
      const id = randomUUID();
      const path = resourceObjectPath(data.filename, randomUUID());
      await tx.insert(learningUploads).values({
        id,
        actorId: caller.id,
        filename: data.filename,
        objectPath: path,
        contentType: data.contentType,
        size: data.size,
        mode: data.mode,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
      const destination = await signLearningUpload(path);
      await audit(tx, {
        actorId: caller.id,
        action: "resource.upload_prepared",
        entity: "learning_uploads",
        entityId: id,
      });
      return { id, filename: data.filename, ...destination };
    },
  );
}

export async function completeResourceUpload(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const result = await mutate(
    idSchema,
    input,
    "resources.manage",
    async (tx, user, data) => {
      const [row] = await tx
        .select()
        .from(learningUploads)
        .where(eq(learningUploads.id, data.id))
        .for("update");
      if (!row || row.actorId !== user.id || row.status !== "pending")
        throw new LearningContentError("Không tìm thấy tệp đang tải của Bạn.");
      let valid = false;
      if (row.expiresAt > new Date()) {
        const actual = await learningObjectInfo(row.objectPath);
        valid =
          actual.size === row.size && actual.contentType === row.contentType;
      }
      await tx
        .update(learningUploads)
        .set({ status: valid ? "uploaded" : "cancelled" })
        .where(eq(learningUploads.id, row.id));
      await audit(tx, {
        actorId: user.id,
        action: valid
          ? "resource.upload_completed"
          : "resource.upload_rejected",
        entity: "learning_uploads",
        entityId: row.id,
      });
      return { id: row.id, valid, path: row.objectPath };
    },
  );
  if (!result.ok) return result;
  if (!result.data.valid) {
    await removeLearningObject({
      bucket: RESOURCE_BUCKET,
      path: result.data.path,
    });
    return {
      ok: false,
      error:
        "Tệp đã hết hạn hoặc sai dung lượng, định dạng. Bạn tải lại tệp đúng thông tin nhé.",
    };
  }
  return { ok: true, data: { id: result.data.id } };
}

export async function cancelResourceUpload(
  input: unknown,
): Promise<ActionResult<{ id: string; cleanupPending: boolean }>> {
  const result = await mutate(
    idSchema,
    input,
    "resources.manage",
    async (tx, user, data) => {
      const [row] = await tx
        .select({
          path: learningUploads.objectPath,
          status: learningUploads.status,
          actorId: learningUploads.actorId,
          expiresAt: learningUploads.expiresAt,
        })
        .from(learningUploads)
        .where(eq(learningUploads.id, data.id))
        .for("update");
      if (
        !row ||
        ["consumed", "cleaned"].includes(row.status) ||
        row.actorId !== user.id
      )
        throw new LearningContentError("Không tìm thấy tệp đang tải của Bạn.");
      await tx
        .update(learningUploads)
        .set({ status: "cancelled" })
        .where(eq(learningUploads.id, data.id));
      await audit(tx, {
        actorId: user.id,
        action: "resource.upload_cancelled",
        entity: "learning_uploads",
        entityId: data.id,
      });
      return { id: data.id, path: row.path };
    },
  );
  if (!result.ok) return result;
  const cleaned = await removeLearningObject({
    bucket: RESOURCE_BUCKET,
    path: result.data.path,
  });
  return { ok: true, data: { id: result.data.id, cleanupPending: !cleaned } };
}
export async function confirmLearningLesson(input: unknown) {
  const result = await mutate(
    confirmLessonSchema,
    input,
    "students.learning.edit",
    (tx, user, data) => confirmStudentLesson(tx, user, data),
  );
  if (result.ok) revalidatePath(`/quan-tri/hoc-vien/${result.data.id}`);
  return result;
}
export async function bulkConfirmLearning(input: unknown) {
  const result = await mutate(
    bulkConfirmSchema,
    input,
    "students.learning.edit",
    async (tx, user, data) => {
      // Stable lock order, one transaction: stale reports roll back the entire batch.
      for (const lesson of [...data.lessons].sort((a, b) =>
        a.planLessonId.localeCompare(b.planLessonId),
      ))
        await confirmStudentLesson(
          tx,
          user,
          { ...lesson, studentId: data.studentId, completed: true },
          false,
          true,
        );
      return { id: data.studentId };
    },
  );
  if (result.ok) revalidatePath(`/quan-tri/hoc-vien/${result.data.id}`);
  return result;
}
