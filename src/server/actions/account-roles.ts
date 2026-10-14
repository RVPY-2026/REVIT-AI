"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { setAccountRoleSchema } from "@/lib/schemas/account-role";
import { USE_MOCK } from "@/lib/runtime-mode";
import { requirePermission } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { userRoles, users } from "@/server/db/schema";
import type { ActionResult } from "@/server/result";

/**
 * Grant or revoke the `admin` or `sale` role on another account.
 * Rules: admins cannot change their own roles, disabled accounts cannot be granted
 * roles, and the last active admin cannot be removed.
 */
export async function setAccountRole(input: unknown): Promise<ActionResult<{ changed: boolean }>> {
  const parsed = setAccountRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu phân quyền chưa hợp lệ." };
  const user = await requirePermission("roles.manage");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi quyền." };

  const { userId, role, granted } = parsed.data;
  if (userId === user.id) return { ok: false, error: "Bạn không thể tự thay đổi quyền của chính mình." };

  try {
    return await db.transaction(async (tx): Promise<ActionResult<{ changed: boolean }>> => {
      // Lock every admin row first, in the same order for every request. Two admins
      // removing each other at the same moment then queue up instead of both succeeding.
      const admins = await tx
        .select({ userId: userRoles.userId, disabledAt: users.disabledAt })
        .from(userRoles)
        .innerJoin(users, eq(users.id, userRoles.userId))
        .where(eq(userRoles.role, "admin"))
        .for("update");

      const [target] = await tx
        .select({ id: users.id, disabledAt: users.disabledAt })
        .from(users)
        .where(eq(users.id, userId))
        .for("update")
        .limit(1);
      if (!target) return { ok: false, error: "Không tìm thấy tài khoản này." };

      if (granted) {
        if (target.disabledAt) return { ok: false, error: "Tài khoản đang bị vô hiệu hóa nên chưa thể cấp quyền." };
        const inserted = await tx
          .insert(userRoles)
          .values({ userId, role })
          .onConflictDoNothing()
          .returning({ role: userRoles.role });
        if (!inserted.length) return { ok: true, data: { changed: false } };
      } else {
        const targetIsAdmin = admins.some((row) => row.userId === userId);
        if (role === "admin" && targetIsAdmin) {
          const otherActiveAdmins = admins.filter((row) => row.userId !== userId && !row.disabledAt);
          if (otherActiveAdmins.length === 0) {
            return { ok: false, error: "Cần giữ ít nhất một tài khoản quản trị đang hoạt động." };
          }
        }
        const deleted = await tx
          .delete(userRoles)
          .where(and(eq(userRoles.userId, userId), eq(userRoles.role, role)))
          .returning({ role: userRoles.role });
        if (!deleted.length) return { ok: true, data: { changed: false } };
      }

      await audit(tx, {
        actorId: user.id,
        action: granted ? "account.role_granted" : "account.role_revoked",
        entity: "users",
        entityId: userId,
        data: { role },
      });
      return { ok: true, data: { changed: true } };
    }).then((result) => {
      if (result.ok && result.data.changed) revalidatePath("/quan-tri/phan-quyen");
      return result;
    });
  } catch {
    return { ok: false, error: "Chưa thể cập nhật quyền. Bạn thử lại sau nhé." };
  }
}
