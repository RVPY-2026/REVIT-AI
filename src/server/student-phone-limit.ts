import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { signupRateLimits } from "@/server/db/schema";

/** Durable per-user budget across workers; only a namespaced digest is stored. */
export async function consumeStudentPhoneLookup(connection: Db, userId: string, now = new Date()): Promise<boolean> {
  const keyHash = createHash("sha256").update(`student-phone-lookup:${userId}`).digest("hex");
  const resetsAt = new Date(now.getTime() + 60_000);
  const [row] = await connection.insert(signupRateLimits).values({ keyHash, used: 1, resetsAt })
    .onConflictDoUpdate({ target: signupRateLimits.keyHash, set: {
      used: sql`case when ${signupRateLimits.resetsAt} <= ${now} then 1 else ${signupRateLimits.used} + 1 end`,
      resetsAt: sql`case when ${signupRateLimits.resetsAt} <= ${now} then ${resetsAt} else ${signupRateLimits.resetsAt} end`,
    }, setWhere: sql`${signupRateLimits.resetsAt} <= ${now} or ${signupRateLimits.used} < 30` })
    .returning({ used: signupRateLimits.used });
  return Boolean(row);
}
