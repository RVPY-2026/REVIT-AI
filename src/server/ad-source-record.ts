import "server-only";
import { and, count, eq, isNull } from "drizzle-orm";
import { can, type SessionUser } from "@/lib/auth/permissions";
import { createAdSourceSchema, updateAdSourceSchema } from "@/lib/schemas/ad-source";
import { studentScope } from "@/server/auth/scope";
import type { Db } from "@/server/db";
import { adSources, students, userRoles, users } from "@/server/db/schema";
import { audit } from "@/server/audit";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export class SourceError extends Error {}
async function checkOwner(tx: Tx, ownerId: string | null) {
  if (!ownerId) return;
  // Lock the account and its sale grant against concurrent role removal.
  const [owner] = await tx.select({ id: users.id }).from(users)
    .where(and(eq(users.id, ownerId), isNull(users.disabledAt))).for("update").limit(1);
  const [role] = await tx.select({ id: userRoles.userId }).from(userRoles)
    .where(and(eq(userRoles.userId, ownerId), eq(userRoles.role, "sale"))).for("update").limit(1);
  if (!owner || !role) throw new SourceError("Bạn chọn tài khoản tư vấn đang hoạt động.");
}
export async function createSourceRecord(tx: Tx, user: SessionUser, input: unknown) {
  if (!can(user, "sources.manage")) throw new SourceError("Bạn không có quyền quản lý nguồn.");
  const data = createAdSourceSchema.parse(input);
  await checkOwner(tx, data.ownerUserId);
  const [row] = await tx.insert(adSources).values(data).onConflictDoNothing({ target: adSources.code }).returning({ id: adSources.id });
  if (!row) throw new SourceError("Mã nguồn đã được dùng. Bạn chọn mã khác.");
  await audit(tx, { actorId: user.id, action: "source.created", entity: "ad_sources", entityId: row.id, data: { after: data } });
  return row;
}
export async function updateSourceRecord(tx: Tx, user: SessionUser, input: unknown) {
  if (!can(user, "sources.manage")) throw new SourceError("Bạn không có quyền quản lý nguồn.");
  const data = updateAdSourceSchema.parse(input);
  const [row] = await tx.select({ id: adSources.id, code: adSources.code, name: adSources.name, ownerUserId: adSources.ownerUserId, active: adSources.active })
    .from(adSources).where(eq(adSources.id, data.id)).for("update").limit(1);
  if (!row) throw new SourceError("Không tìm thấy nguồn. Bạn tải lại danh sách.");
  if (row.name !== data.expectedName || row.ownerUserId !== data.expectedOwnerUserId || row.active !== data.expectedActive)
    throw new SourceError("Nguồn đã được người khác sửa. Bạn tải lại danh sách rồi thử lại.");
  if (row.code === "R" && !data.active) throw new SourceError("Nguồn R cần hoạt động để nhận đăng ký chung. Bạn giữ nguồn này hoạt động.");
  if (row.ownerUserId !== data.ownerUserId) {
    await checkOwner(tx, data.ownerUserId);
    const [stats] = await tx.select({ total: count() }).from(students)
      .where(and(eq(students.sourceId, row.id), studentScope(user, "management")));
    if (stats.total > 0 && (!data.confirmOwnerChange || data.expectedLeadCount !== stats.total))
      throw new SourceError("Số hồ sơ đã thay đổi hoặc chưa được xác nhận. Bạn tải lại nguồn và xác nhận chuyển hồ sơ.");
  }
  const after = { name: data.name, ownerUserId: data.ownerUserId, active: data.active };
  await tx.update(adSources).set(after).where(eq(adSources.id, row.id));
  await audit(tx, { actorId: user.id, action: "source.updated", entity: "ad_sources", entityId: row.id,
    data: { before: { name: row.name, ownerUserId: row.ownerUserId, active: row.active }, after } });
  return { id: row.id };
}
