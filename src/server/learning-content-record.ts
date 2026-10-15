import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { normalizeYoutube, validateUpload } from "@/lib/learning-content";
import { RESOURCE_BUCKET } from "@/server/learning-upload-config";
import {
  lessonSchema,
  resourceSchema,
  reorderSchema,
  toggleSchema,
  trialSwapSchema,
} from "@/lib/schemas/learning-content";
import type { Db } from "@/server/db";
import {
  lessons,
  learningResources,
  learningUploads,
} from "@/server/db/schema";
import { audit } from "@/server/audit";

export type LearningTx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export class LearningContentError extends Error {}
export function assertContentPermission(
  user: SessionUser,
  domain: "resources" | "lessons",
) {
  if (!can(user, `${domain}.manage`))
    throw new LearningContentError("Bạn không có quyền quản lý nội dung học.");
}
/** Serializes creates, reorders and swaps, including an empty group. */
async function lockContent(tx: LearningTx, domain: "resources" | "lessons") {
  await tx.execute(
    sql`select pg_advisory_xact_lock(${domain === "lessons" ? 6001 : 6002})`,
  );
}
export async function saveLessonRecord(
  tx: LearningTx,
  user: SessionUser,
  input: z.infer<typeof lessonSchema>,
) {
  assertContentPermission(user, "lessons");
  const data = lessonSchema.parse(input);
  await lockContent(tx, "lessons");
  if (data.id) {
    const [row] = await tx
      .select({
        id: lessons.id,
        phase: lessons.phase,
        trialOrder: lessons.trialOrder,
      })
      .from(lessons)
      .where(eq(lessons.id, data.id))
      .for("update");
    if (!row)
      throw new LearningContentError(
        "Không tìm thấy bài học. Bạn tải lại danh sách nhé.",
      );
    if (row.phase !== data.phase)
      throw new LearningContentError("Bạn giữ nguyên giai đoạn của bài học.");
    if (row.trialOrder !== null && !data.active)
      throw new LearningContentError(
        "Bạn đổi bài học thử trước khi ngừng bài này.",
      );
    await tx
      .update(lessons)
      .set({
        title: data.title,
        baseDays: data.baseDays,
        lessonNumbers: data.lessonNumbers,
        active: data.active,
      })
      .where(eq(lessons.id, data.id));
  } else {
    const rows = await tx
      .select({ order: lessons.sortOrder })
      .from(lessons)
      .where(eq(lessons.phase, data.phase))
      .for("update");
    const [created] = await tx
      .insert(lessons)
      .values({
        ...data,
        sortOrder: Math.max(-1, ...rows.map((r) => r.order)) + 1,
      })
      .returning({ id: lessons.id });
    data.id = created.id;
  }
  // Only the template is updated. Existing plan snapshots are never written here.
  await audit(tx, {
    actorId: user.id,
    action: "lesson.template_saved",
    entity: "lessons",
    entityId: data.id!,
  });
  return { id: data.id! };
}
export async function swapTrialRecords(
  tx: LearningTx,
  user: SessionUser,
  input: z.infer<typeof trialSwapSchema>,
) {
  assertContentPermission(user, "lessons");
  const data = trialSwapSchema.parse(input);
  await lockContent(tx, "lessons");
  const rows = await tx
    .select({
      id: lessons.id,
      phase: lessons.phase,
      active: lessons.active,
      trialOrder: lessons.trialOrder,
    })
    .from(lessons)
    .orderBy(asc(lessons.trialOrder))
    .for("update");
  const current = rows.filter((r) => r.trialOrder !== null).map((r) => r.id);
  if (JSON.stringify(current) !== JSON.stringify(data.expectedIds))
    throw new LearningContentError(
      "Bài học thử đã thay đổi. Bạn tải lại danh sách nhé.",
    );
  if (
    data.lessonIds.some(
      (id) =>
        !rows.some((r) => r.id === id && r.active && r.phase === "foundation"),
    )
  )
    throw new LearningContentError(
      "Bạn chọn đúng ba bài đang dùng trong Nền tảng.",
    );
  // Clear the unique slots inside the transaction, then assign all three before commit.
  await tx.update(lessons).set({ trialOrder: null });
  for (const [index, id] of data.lessonIds.entries())
    await tx
      .update(lessons)
      .set({ trialOrder: index + 1 })
      .where(eq(lessons.id, id));
  await audit(tx, {
    actorId: user.id,
    action: "lesson.trial_swapped",
    entity: "lessons",
    entityId: data.lessonIds[0],
    data: { lessonIds: data.lessonIds },
  });
  return { id: data.lessonIds[0] };
}
export async function reorderContent(
  tx: LearningTx,
  user: SessionUser,
  domain: "resources" | "lessons",
  input: z.infer<typeof reorderSchema>,
) {
  assertContentPermission(user, domain);
  const data = reorderSchema.parse(input);
  await lockContent(tx, domain);
  const table = domain === "lessons" ? lessons : learningResources;
  const [target] = await tx
    .select({ id: table.id })
    .from(table)
    .where(eq(table.id, data.id))
    .for("update");
  if (!target)
    throw new LearningContentError(
      "Không tìm thấy nội dung. Bạn tải lại danh sách nhé.",
    );
  let group;
  if (domain === "lessons") {
    const [row] = await tx
      .select({ phase: lessons.phase })
      .from(lessons)
      .where(eq(lessons.id, data.id));
    group = eq(lessons.phase, row.phase);
  } else {
    const [row] = await tx
      .select({ lessonId: learningResources.lessonId })
      .from(learningResources)
      .where(eq(learningResources.id, data.id));
    group = row.lessonId
      ? eq(learningResources.lessonId, row.lessonId)
      : isNull(learningResources.lessonId);
  }
  const rows = await tx
    .select({ id: table.id, order: table.sortOrder })
    .from(table)
    .where(group)
    .orderBy(asc(table.sortOrder), asc(table.id))
    .for("update");
  if (
    JSON.stringify(rows.map((r) => r.id)) !== JSON.stringify(data.expectedOrder)
  )
    throw new LearningContentError(
      "Thứ tự đã thay đổi. Bạn tải lại danh sách nhé.",
    );
  const index = rows.findIndex((r) => r.id === data.id);
  const next = index + (data.direction === "up" ? -1 : 1);
  if (next < 0 || next >= rows.length) return { id: data.id };
  [rows[index], rows[next]] = [rows[next], rows[index]];
  // A disjoint temporary range avoids transient (phase, sort_order) violations.
  const temporaryStart =
    Math.min(0, ...rows.map((r) => r.order)) - rows.length - 1;
  for (const [i, row] of rows.entries())
    await tx
      .update(table)
      .set({ sortOrder: temporaryStart + i })
      .where(eq(table.id, row.id));
  for (const [i, row] of rows.entries())
    await tx.update(table).set({ sortOrder: i }).where(eq(table.id, row.id));
  await audit(tx, {
    actorId: user.id,
    action: `${domain}.reordered`,
    entity: domain === "lessons" ? "lessons" : "learning_resources",
    entityId: data.id,
  });
  return { id: data.id };
}
export async function toggleContent(
  tx: LearningTx,
  user: SessionUser,
  domain: "resources" | "lessons",
  input: z.infer<typeof toggleSchema>,
) {
  assertContentPermission(user, domain);
  const data = toggleSchema.parse(input);
  await lockContent(tx, domain);
  const table = domain === "lessons" ? lessons : learningResources;
  const [row] = await tx
    .select({ active: table.active })
    .from(table)
    .where(eq(table.id, data.id))
    .for("update");
  if (!row) throw new LearningContentError("Không tìm thấy nội dung.");
  if (row.active !== data.expectedActive)
    throw new LearningContentError(
      "Trạng thái đã thay đổi. Bạn tải lại danh sách nhé.",
    );
  if (domain === "lessons" && !data.active) {
    const [lesson] = await tx
      .select({ trialOrder: lessons.trialOrder })
      .from(lessons)
      .where(eq(lessons.id, data.id));
    if (lesson.trialOrder !== null)
      throw new LearningContentError(
        "Bạn đổi bài học thử trước khi ngừng bài này.",
      );
  }
  await tx
    .update(table)
    .set({ active: data.active })
    .where(eq(table.id, data.id));
  await audit(tx, {
    actorId: user.id,
    action: `${domain}.active_changed`,
    entity: domain === "lessons" ? "lessons" : "learning_resources",
    entityId: data.id,
    data: { active: data.active },
  });
  return { id: data.id };
}
export async function saveResourceRecord(
  tx: LearningTx,
  user: SessionUser,
  input: z.infer<typeof resourceSchema>,
) {
  assertContentPermission(user, "resources");
  const data = resourceSchema.parse(input);
  await lockContent(tx, "resources");
  const [old] = data.id
    ? await tx
        .select({
          id: learningResources.id,
          bucket: learningResources.bucket,
          objectPath: learningResources.objectPath,
          mode: learningResources.mode,
        })
        .from(learningResources)
        .where(eq(learningResources.id, data.id))
        .for("update")
    : [];
  if (data.id && !old)
    throw new LearningContentError(
      "Không tìm thấy tài liệu. Bạn tải lại danh sách nhé.",
    );
  if (data.lessonId) {
    const [lesson] = await tx
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.id, data.lessonId))
      .for("update");
    if (!lesson)
      throw new LearningContentError("Bạn chọn bài học còn tồn tại.");
  }
  let origin: {
    bucket: string | null;
    objectPath: string | null;
    externalUrl: string | null;
  };
  if (data.source === "youtube")
    origin = {
      bucket: null,
      objectPath: null,
      externalUrl: normalizeYoutube(data.youtubeUrl)!,
    };
  else if (data.uploadId) {
    const [upload] = await tx
      .select()
      .from(learningUploads)
      .where(
        and(
          eq(learningUploads.id, data.uploadId),
          eq(learningUploads.actorId, user.id),
        ),
      )
      .for("update");
    if (
      !upload ||
      upload.status !== "uploaded" ||
      upload.expiresAt < new Date()
    )
      throw new LearningContentError(
        "Tệp chưa tải xong hoặc đã hết hạn. Bạn tải lại tệp nhé.",
      );
    const error = validateUpload({
      filename: upload.filename,
      contentType: upload.contentType,
      size: upload.size,
      mode: data.mode,
    });
    if (error) throw new LearningContentError(error);
    origin = {
      bucket: RESOURCE_BUCKET,
      objectPath: upload.objectPath,
      externalUrl: null,
    };
    await tx
      .update(learningUploads)
      .set({ status: "consumed" })
      .where(eq(learningUploads.id, upload.id));
  } else {
    if (!old?.objectPath)
      throw new LearningContentError("Bạn tải tệp lên trước khi lưu.");
    // Retained files cannot silently switch into view mode without validation.
    if (old.mode === "download" && data.mode === "view")
      throw new LearningContentError("Bạn tải lại tệp để chuyển sang Chỉ xem.");
    origin = {
      bucket: old.bucket,
      objectPath: old.objectPath,
      externalUrl: null,
    };
  }
  const values = {
    title: data.title,
    lessonId: data.lessonId,
    audience: data.audience,
    mode: data.mode,
    active: data.active,
    ...origin,
  };
  let id = data.id;
  if (id)
    await tx
      .update(learningResources)
      .set(values)
      .where(eq(learningResources.id, id));
  else {
    const group = data.lessonId
      ? eq(learningResources.lessonId, data.lessonId)
      : isNull(learningResources.lessonId);
    const rows = await tx
      .select({ order: learningResources.sortOrder })
      .from(learningResources)
      .where(group)
      .for("update");
    const [created] = await tx
      .insert(learningResources)
      .values({
        ...values,
        sortOrder: Math.max(-1, ...rows.map((r) => r.order)) + 1,
      })
      .returning({ id: learningResources.id });
    id = created.id;
  }
  if (
    old?.bucket === RESOURCE_BUCKET &&
    old.objectPath &&
    old.objectPath !== origin.objectPath
  )
    await retireUpload(tx, user, old.objectPath);
  await audit(tx, {
    actorId: user.id,
    action: "resource.saved",
    entity: "learning_resources",
    entityId: id!,
  });
  return {
    id: id!,
    cleanup:
      old?.objectPath && old.objectPath !== origin.objectPath
        ? { bucket: old.bucket!, path: old.objectPath }
        : null,
  };
}
export async function deleteResourceRecord(
  tx: LearningTx,
  user: SessionUser,
  id: string,
) {
  assertContentPermission(user, "resources");
  await lockContent(tx, "resources");
  const [row] = await tx
    .select({
      bucket: learningResources.bucket,
      path: learningResources.objectPath,
    })
    .from(learningResources)
    .where(eq(learningResources.id, id))
    .for("update");
  if (!row) throw new LearningContentError("Không tìm thấy tài liệu.");
  await tx.delete(learningResources).where(eq(learningResources.id, id));
  if (row.bucket === RESOURCE_BUCKET && row.path)
    await retireUpload(tx, user, row.path);
  await audit(tx, {
    actorId: user.id,
    action: "resource.deleted",
    entity: "learning_resources",
    entityId: id,
  });
  return {
    id,
    cleanup:
      row.bucket && row.path ? { bucket: row.bucket, path: row.path } : null,
  };
}

/** A still-valid signed capability can recreate a deleted object; sweep it again after expiry. */
async function retireUpload(tx: LearningTx, user: SessionUser, path: string) {
  const [lease] = await tx
    .select({ id: learningUploads.id })
    .from(learningUploads)
    .where(
      and(
        eq(learningUploads.objectPath, path),
        eq(learningUploads.status, "consumed"),
      ),
    )
    .for("update");
  if (!lease) return;
  await tx
    .update(learningUploads)
    .set({ status: "cancelled" })
    .where(eq(learningUploads.id, lease.id));
  await audit(tx, {
    actorId: user.id,
    action: "resource.upload_retired",
    entity: "learning_uploads",
    entityId: lease.id,
  });
}
