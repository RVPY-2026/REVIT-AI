import { NextResponse } from "next/server";
import { resourceIdSchema } from "@/lib/schemas/student-area";
import { INLINE_CONTENT_TYPES } from "@/lib/student-learning";
import { USE_MOCK, requirePermission } from "@/server/auth/session";
import { getMyResourceFile } from "@/server/queries/student-area";
import { downloadPrivateObject } from "@/server/storage";

const NOT_FOUND = { error: "Không tìm thấy tệp." };

/**
 * Streams one learning file to the student it belongs to. Viewable files (PDF, images) are sent
 * inline only; installers are the sole attachments. The storage address is never exposed.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("student-area.view");
  const { id } = await context.params;
  if (!resourceIdSchema.safeParse(id).success) return NextResponse.json(NOT_FOUND, { status: 404 });
  if (USE_MOCK) return NextResponse.json({ error: "Chế độ xem thử không có tệp thật." }, { status: 503 });

  const file = await getMyResourceFile(user, id);
  if (!file) return NextResponse.json(NOT_FOUND, { status: 404 });

  const extension = file.objectPath.split(".").pop()?.toLowerCase() ?? "";
  const inlineType = INLINE_CONTENT_TYPES[extension];
  if (file.mode === "view" && !inlineType) {
    return NextResponse.json({ error: "Định dạng này chưa xem trực tuyến được." }, { status: 415 });
  }

  const blob = await downloadPrivateObject(file.bucket, file.objectPath);
  if (!blob) return NextResponse.json(NOT_FOUND, { status: 404 });

  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (file.mode === "view") {
    headers["Content-Type"] = inlineType;
    headers["Content-Disposition"] = "inline";
  } else {
    const name = (file.objectPath.split("/").pop() ?? "rvpy-addin").replace(/[^A-Za-z0-9._-]/g, "_");
    headers["Content-Type"] = "application/octet-stream";
    headers["Content-Disposition"] = `attachment; filename="${name}"`;
  }
  return new Response(blob.stream(), { headers });
}
