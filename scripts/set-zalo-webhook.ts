import { config } from "dotenv";
import { createZaloBotClient } from "../src/server/zalo/client";

config({ path: ".env.local", quiet: true });

async function main() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.ZALO_BOT_WEBHOOK_SECRET;
  const token = process.env.ZALO_BOT_TOKEN;
  const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (!token || !secret || secret.length < 8 || !origin)
    throw new Error("Set ZALO_BOT_TOKEN, ZALO_BOT_WEBHOOK_SECRET and NEXT_PUBLIC_SITE_URL first.");
  const base = new URL(origin);
  if (base.protocol !== "https:") throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS.");
  if (base.hostname.endsWith(".vercel.app") && !protectionBypass)
    throw new Error("Set VERCEL_AUTOMATION_BYPASS_SECRET for a protected Vercel Preview deployment.");
  const webhookUrl = new URL("/api/webhooks/zalo-bot", base);
  if (protectionBypass) webhookUrl.searchParams.set("x-vercel-protection-bypass", protectionBypass);
  const result = await createZaloBotClient(token).setWebhook(webhookUrl.toString(), secret) as {
    verification?: { ok?: boolean };
  } | null;
  console.log(result?.verification?.ok ? "Webhook registered and verified." : "Webhook registered; Zalo could not verify its response yet.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && !error.message.includes("http") ? error.message : "Webhook setup failed.");
  process.exitCode = 1;
});
