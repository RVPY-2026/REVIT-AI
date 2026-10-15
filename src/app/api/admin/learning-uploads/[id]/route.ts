import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { USE_MOCK } from "@/lib/runtime-mode";
import { validateUpload } from "@/lib/learning-content";
import { RESOURCE_BUCKET } from "@/server/learning-upload-config";
import { requirePermission } from "@/server/auth/session";
import { db } from "@/server/db";
import { learningUploads } from "@/server/db/schema";
import { audit } from "@/server/audit";
import { streamLearningObject, removeLearningObject } from "@/server/learning-storage";

export const runtime = "nodejs";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("resources.manage");
  if (USE_MOCK) return Response.json({ error: "Chế độ xem thử chưa lưu thay đổi." }, { status: 400 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success || !request.body || request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Yêu cầu tải tệp chưa hợp lệ." }, { status: 400 });
  let path: string | null = null;
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(learningUploads).where(and(eq(learningUploads.id, id), eq(learningUploads.actorId, user.id))).for("update");
      if (!row || row.status !== "pending" || row.expiresAt < new Date()) throw new Error("Invalid reservation");
      path = row.objectPath;
      if (validateUpload({ ...row, mode: row.mode as "view" | "download" }) || request.headers.get("content-type") !== row.contentType || Number(request.headers.get("content-length")) !== row.size) throw new Error("Invalid metadata");
      await streamLearningObject(row.objectPath, row.contentType, row.size, request.body!, request.signal);
      await tx.update(learningUploads).set({ status: "uploaded" }).where(eq(learningUploads.id, id));
      await audit(tx, { actorId: user.id, action: "resource.uploaded", entity: "learning_uploads", entityId: id });
    });
    revalidatePath("/quan-tri/tai-lieu");
    return Response.json({ ok: true });
  } catch {
    if (path) await removeLearningObject({ bucket: RESOURCE_BUCKET, path });
    return Response.json({ error: "Chưa tải được tệp. Bạn kiểm tra kết nối rồi thử lại." }, { status: 400 });
  }
}
