"use server";
import { revalidatePath } from "next/cache";
import { retryQueueSchema } from "@/lib/schemas/admin-viewers";
import { USE_MOCK, requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { QueueError, retryQueueRecord } from "@/server/zalo-queue-record";
import type { ActionResult } from "@/server/result";
export async function retryZaloQueue(input: unknown): Promise<ActionResult<{ count: number }>> {
  const parsed = retryQueueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bạn xác nhận các mục cần thử lại." };
  const user = await requirePermission("zalo.view");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi." };
  try {
    const data = await db.transaction((tx) => retryQueueRecord(tx, user, parsed.data));
    revalidatePath("/quan-tri", "layout");
    return { ok: true, data };
  } catch (error) { return { ok: false, error: error instanceof QueueError ? error.message : "Chưa thử lại được. Bạn kiểm tra kết nối." }; }
}
