import "server-only";
import { and, asc, eq, inArray, lt, lte, ne, notExists, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { serverEnv } from "@/server/env";
import { db } from "@/server/db";
import { zaloBotConnections, zaloBotOutbox } from "@/server/db/schema";
import { createZaloBotClient } from "@/server/zalo/client";
import { ZALO_ONBOARDING_MESSAGES } from "@/server/zalo/messages";

/** The single reset path for profile and queue retries; delivery remains cron-owned. */
export async function resetFailedZaloItems(tx: Tx, ids: string[]) {
  if (!ids.length) return [];
  return tx.update(zaloBotOutbox).set({ status: "pending", attempts: 0, availableAt: new Date(), lastError: null })
    .where(and(inArray(zaloBotOutbox.id, ids), eq(zaloBotOutbox.status, "failed"))).returning({ id: zaloBotOutbox.id });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function queueOnboarding(tx: Tx, studentId: string, chatId: string) {
  await tx.insert(zaloBotOutbox).values(ZALO_ONBOARDING_MESSAGES.map(({ kind, body }, index) => ({
    studentId, chatId, eventKey: `onboarding:${studentId}:${index + 1}`,
    sequence: index + 1, kind, body,
  }))).onConflictDoNothing({ target: zaloBotOutbox.eventKey });
}

export async function queueTrialThanks(tx: Tx, studentId: string, trialStartedAt: Date) {
  const [connection] = await tx.select({ chatId: zaloBotConnections.chatId }).from(zaloBotConnections)
    .where(eq(zaloBotConnections.studentId, studentId)).limit(1);
  if (!connection?.chatId || !serverEnv.ZALO_BOT_THANKS_IMAGE_URL) return;
  const chatId = connection.chatId;
  const eventKey = `trial-thanks:${studentId}:${trialStartedAt.toISOString()}`;
  await tx.insert(zaloBotOutbox).values({
    studentId, chatId, eventKey, sequence: 1, kind: "photo",
    body: serverEnv.ZALO_BOT_THANKS_IMAGE_URL,
  }).onConflictDoNothing({ target: zaloBotOutbox.eventKey });
}

/** Send one globally ordered due item per transaction; failures remain queued for retry. */
export async function sendNextZaloMessage() {
  const token = serverEnv.ZALO_BOT_TOKEN;
  if (!token) return false;
  const row = await db.transaction(async (tx) => {
    const earlier = alias(zaloBotOutbox, "earlier_zalo_message");
    const [item] = await tx.select().from(zaloBotOutbox)
      .where(and(
        eq(zaloBotOutbox.status, "pending"),
        lte(zaloBotOutbox.availableAt, new Date()),
        notExists(tx.select({ id: earlier.id }).from(earlier).where(and(
          eq(earlier.chatId, zaloBotOutbox.chatId),
          ne(earlier.status, "sent"),
          or(
            lt(earlier.createdAt, zaloBotOutbox.createdAt),
            and(eq(earlier.createdAt, zaloBotOutbox.createdAt), lt(earlier.sequence, zaloBotOutbox.sequence)),
          ),
        ))),
      ))
      .orderBy(asc(zaloBotOutbox.createdAt), asc(zaloBotOutbox.sequence))
      .for("update", { skipLocked: true }).limit(1);
    if (!item) return null;
    // Keep this chat's order while sending, including across concurrent webhook/cron invocations.
    try {
      const bot = createZaloBotClient(token);
      if (item.kind === "photo") await bot.sendPhoto(item.chatId, item.body, item.eventKey.startsWith("trial-thanks:") ? "Cảm ơn em đã xác nhận tham gia học thử cùng RVPY! 🚀" : undefined);
      else await bot.sendText(item.chatId, item.body);
      await tx.update(zaloBotOutbox).set({ status: "sent", sentAt: new Date(), attempts: item.attempts + 1, lastError: null }).where(eq(zaloBotOutbox.id, item.id));
    } catch {
      const attempts = item.attempts + 1;
      await tx.update(zaloBotOutbox).set({
        status: attempts >= 6 ? "failed" : "pending", attempts,
        availableAt: new Date(Date.now() + Math.min(60 * 60_000, 2 ** attempts * 30_000)),
        lastError: "Zalo API delivery failed",
      }).where(eq(zaloBotOutbox.id, item.id));
    }
    return item.id;
  });
  return Boolean(row);
}

export async function drainZaloOutbox(limit = 10, budgetMs = 40_000) {
  const deadline = Date.now() + budgetMs;
  let processed = 0;
  for (let index = 0; index < limit && Date.now() < deadline - 15_000; index++) {
    if (!(await sendNextZaloMessage())) break;
    processed++;
  }
  return { processed };
}
