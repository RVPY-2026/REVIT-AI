import "server-only";
import type { Db } from "@/server/db";
import { auditLog } from "@/server/db/schema";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Record a mutation. Call inside the same transaction as the change. */
export async function audit(
  tx: Db | Tx,
  entry: { actorId: string | null; action: string; entity: string; entityId?: string; data?: Record<string, unknown> },
) {
  await tx.insert(auditLog).values(entry);
}
