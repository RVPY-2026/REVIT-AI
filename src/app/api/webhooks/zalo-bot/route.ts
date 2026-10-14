import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/server/db";
import { zaloBotConnections } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { queueOnboarding, drainZaloOutbox } from "@/server/zalo/outbox";
import { createZaloBotClient } from "@/server/zalo/client";
import { parseZaloWebhookUpdate } from "@/server/zalo/webhook-payload";
import { normalizeZaloLinkCode } from "@/server/zalo/link-code";

export const maxDuration = 60;

function validWebhookSecret(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  if (!validWebhookSecret(request.headers.get("x-bot-api-secret-token"), serverEnv.ZALO_BOT_WEBHOOK_SECRET))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!serverEnv.ZALO_BOT_TOKEN) return Response.json({ error: "Bot is not configured" }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid payload" }, { status: 400 }); }
  const update = parseZaloWebhookUpdate(body);
  if (!update) {
    const keys = body && typeof body === "object" ? Object.keys(body).slice(0, 12) : [];
    console.warn("Zalo webhook payload did not match the expected shape", { keys });
    return Response.json({ ok: true });
  }
  const { event_name: eventName, message } = update;
  if (eventName !== "message.text.received" || !message || message.chat.chat_type !== "PRIVATE" || message.from.is_bot === true)
    return Response.json({ ok: true });

  const bot = createZaloBotClient(serverEnv.ZALO_BOT_TOKEN);
  const incomingText = message.text?.trim() ?? "";
  const linkCode = normalizeZaloLinkCode(incomingText);
  if (!linkCode) {
    if (incomingText === "/start" || incomingText.toLocaleLowerCase("vi") === "bắt đầu") {
      await bot.sendText(message.chat.id, "Để nhận hướng dẫn sau đăng ký, hãy gửi mã kết nối ở trang Cảm ơn đăng ký học thử RVPY. Mã có hiệu lực trong 30 phút.");
    }
    return Response.json({ ok: true });
  }
  const tokenHash = createHash("sha256").update(linkCode).digest("hex");
  let linked = false;
  try {
    await db.transaction(async (tx) => {
      const [connection] = await tx.select({ studentId: zaloBotConnections.studentId, chatId: zaloBotConnections.chatId })
        .from(zaloBotConnections).where(and(
          eq(zaloBotConnections.linkTokenHash, tokenHash), gt(zaloBotConnections.expiresAt, new Date()),
        )).for("update").limit(1);
      if (!connection) return;
      if (connection.chatId && connection.chatId !== message.chat.id) return;
      if (!connection.chatId) {
        await tx.update(zaloBotConnections).set({ chatId: message.chat.id, connectedAt: new Date() })
          .where(eq(zaloBotConnections.studentId, connection.studentId));
      }
      await queueOnboarding(tx, connection.studentId, message.chat.id);
      linked = true;
    });
    if (!linked) {
      await bot.sendText(message.chat.id, "Mã kết nối không hợp lệ hoặc đã hết hạn. Em mở lại trang cảm ơn trên trình duyệt đã đăng ký và bấm Lấy mã kết nối mới nhé. Nếu không còn phiên đăng ký, hãy liên hệ RVPY để được hỗ trợ.");
      return Response.json({ ok: true });
    }
    await drainZaloOutbox(10);
  } catch (error) {
    // Keep identifiers, message contents and credentials out of logs; let Zalo retry transient failures.
    console.error("Zalo webhook processing failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
