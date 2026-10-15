import { serverEnv } from "@/server/env";
import { drainZaloOutbox } from "@/server/zalo/outbox";
import { cleanupSignupLimits } from "@/server/signup-protection";

import { cleanupLearningUploads } from "@/server/learning-upload-cleanup";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await drainZaloOutbox(100);
  await cleanupSignupLimits();
  const learningUploadsCleaned = await cleanupLearningUploads();
  return Response.json({ ok: true, ...result, learningUploadsCleaned }, { headers: { "Cache-Control": "no-store" } });
}
