import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { retryQueueSchema } from "@/lib/schemas/admin-viewers";
import type { Db } from "@/server/db";
import { students, zaloBotOutbox } from "@/server/db/schema";
import { studentScope } from "@/server/auth/scope";
import { resetFailedZaloItems } from "@/server/zalo/outbox";
import { audit } from "@/server/audit";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export class QueueError extends Error {}
export async function retryQueueRecord(tx: Tx, user: SessionUser, input: unknown) {
  if (!can(user, "zalo.view")) throw new QueueError("Bạn không có quyền thử lại tin Zalo.");
  const data = retryQueueSchema.parse(input);
  const rows = await tx.select({ id: zaloBotOutbox.id }).from(zaloBotOutbox)
    .innerJoin(students, eq(students.id, zaloBotOutbox.studentId))
    .where(and(studentScope(user, "management"), eq(zaloBotOutbox.status, "failed"), data.id ? eq(zaloBotOutbox.id, data.id) : undefined))
    .orderBy(asc(zaloBotOutbox.createdAt), asc(zaloBotOutbox.id)).limit(data.all ? 50 : 1)
    .for("update", { of: zaloBotOutbox, skipLocked: true });
  if (!rows.length) throw new QueueError("Không còn mục lỗi để thử lại. Bạn tải lại danh sách.");
  const retried = await resetFailedZaloItems(tx, rows.map((r) => r.id));
  await audit(tx, { actorId: user.id, action: "zalo.retried", entity: "zalo_bot_outbox", entityId: data.id,
    data: { count: retried.length, ids: retried.map((r) => r.id) } });
  return { count: retried.length };
}
