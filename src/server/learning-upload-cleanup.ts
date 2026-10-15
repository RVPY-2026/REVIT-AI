import "server-only";
import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { learningUploads } from "@/server/db/schema";
import { audit } from "@/server/audit";
import { RESOURCE_BUCKET } from "@/server/learning-upload-config";
import { removeLearningObject } from "@/server/learning-storage";

/** Recheck cancelled uploads after their two-hour signed capability expires. */
export async function cleanupLearningUploads(actorId: string | null = null) {
  const candidates = await db
    .select({ id: learningUploads.id })
    .from(learningUploads)
    .where(
      and(
        lt(learningUploads.expiresAt, new Date()),
        ne(learningUploads.status, "consumed"),
        ne(learningUploads.status, "cleaned"),
      ),
    )
    .orderBy(learningUploads.expiresAt, learningUploads.id)
    .limit(100);
  let cleaned = 0;
  for (const candidate of candidates) {
    cleaned += await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(learningUploads)
        .where(eq(learningUploads.id, candidate.id))
        .for("update");
      if (
        !row ||
        row.expiresAt >= new Date() ||
        ["consumed", "cleaned"].includes(row.status)
      )
        return 0;
      if (
        !(await removeLearningObject({
          bucket: RESOURCE_BUCKET,
          path: row.objectPath,
        }))
      )
        return 0;
      await tx
        .update(learningUploads)
        .set({ status: "cleaned" })
        .where(eq(learningUploads.id, row.id));
      await audit(tx, {
        actorId,
        action: "resource.upload_cleaned",
        entity: "learning_uploads",
        entityId: row.id,
      });
      return 1;
    });
  }
  return cleaned;
}
