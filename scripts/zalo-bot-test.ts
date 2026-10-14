import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { createZaloBotClient, ZaloBotError } from "../src/server/zalo/client";
import { createTestSession } from "../src/server/zalo/test-session";

config({ path: ".env.local", quiet: true });

async function main() {
  const bot = createZaloBotClient(process.env.ZALO_BOT_TOKEN ?? "");
  await bot.getMe();
  console.log("Bot token valid.");
  if (process.argv.includes("--check")) return;
  // The live API returns 404 when no webhook has been registered.
  const webhook = await bot.getWebhookInfo().catch((error: unknown) => {
    if (error instanceof ZaloBotError && error.code === 404) return null;
    throw error;
  }) as { url?: string } | null;
  if (webhook?.url) throw new Error("Webhook configured; local polling cannot run. No settings were changed.");

  const command = `/test ${randomBytes(6).toString("hex")}`;
  const startedAt = Date.now();
  const accept = createTestSession(command, startedAt);
  console.log(`Send this exact command to your bot in a private Zalo chat: ${command}`);
  console.log("Waiting for up to 15 minutes. Only this command triggers test replies. Ctrl+C stops.");
  while (Date.now() - startedAt < 15 * 60_000) {
    const result = await bot.getUpdates().catch((error: unknown) => {
      if (error instanceof ZaloBotError && error.code === 408) return null;
      throw error;
    });
    const events = Array.isArray(result) ? result : [result];
    for (const event of events) {
      const chatId = accept(event);
      if (!chatId) continue;
      // Do not retry sends automatically: a timeout can mean Zalo already delivered it.
      await bot.sendText(chatId, "✅ RVPY đã kết nối Zalo Bot thành công. Đây là tin thử, chưa tạo hoặc thay đổi hồ sơ học viên.");
      await bot.sendText(chatId, "Tin thứ hai: bot có thể gửi từng tin riêng theo thứ tự. Luồng tư vấn và xác nhận học thử sẽ được nối vào website sau bước kiểm tra này.");
      const photo = process.env.ZALO_BOT_TEST_PHOTO_URL;
      if (photo) await bot.sendPhoto(chatId, photo, "Ảnh thử kết nối RVPY.");
      console.log(photo ? "Two test messages and one photo sent." : "Two test messages sent. Photo skipped: no test image configured.");
      return;
    }
  }
  console.log("Test expired without a matching private message. No messages sent.");
}

main().catch((error: unknown) => {
  // Never print SDK/network error objects containing a credential-bearing URL.
  console.error(error instanceof Error && !error.message.includes("http") ? error.message : "Zalo Bot test failed.");
  process.exitCode = 1;
});
