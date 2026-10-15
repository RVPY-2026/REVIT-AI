"use server";
import { revalidatePath } from "next/cache";
import { createAdSourceSchema, updateAdSourceSchema } from "@/lib/schemas/ad-source";
import { USE_MOCK, requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { createSourceRecord, updateSourceRecord, SourceError } from "@/server/ad-source-record";
import type { ActionResult } from "@/server/result";

async function save(input: unknown, update: boolean): Promise<ActionResult<{ id: string }>> {
  const parsed = (update ? updateAdSourceSchema : createAdSourceSchema).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bạn kiểm tra lại thông tin nguồn.", fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), [issue.message]])) };
  const user = await requirePermission("sources.manage");
  if (USE_MOCK) return { ok: false, error: "Chế độ xem thử chưa lưu thay đổi." };
  try {
    const data = await db.transaction((tx) => update ? updateSourceRecord(tx, user, parsed.data) : createSourceRecord(tx, user, parsed.data));
    revalidatePath("/quan-tri", "layout");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof SourceError ? error.message : "Chưa lưu được nguồn. Bạn thử lại sau.",
      ...(error instanceof SourceError && error.message.includes("Mã nguồn") ? { fieldErrors: { code: [error.message] } } : {}) };
  }
}
export async function createAdSource(input: unknown) { return save(input, false); }
export async function updateAdSource(input: unknown) { return save(input, true); }
