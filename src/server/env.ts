import "server-only";
import { z } from "zod";

import { USE_MOCK } from "@/lib/runtime-mode";

// Server-only secrets. Validated on first import so a missing variable fails loudly.
// In mock mode (no database yet) DATABASE_URL may be absent; nothing queries it then.
const schema = z.object({
  DATABASE_URL: USE_MOCK ? z.url().default("postgres://mock:mock@localhost:5432/mock") : z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(), // only for Storage admin tasks
  CRON_SECRET: z.string().min(16).optional(),
  SIGNUP_RATE_LIMIT_SECRET: z.string().min(32).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  ZALO_BOT_TOKEN: z.string().min(1).optional(),
  ZALO_BOT_WEBHOOK_SECRET: z.string().min(8).max(256).optional(),
  ZALO_BOT_THANKS_IMAGE_URL: z.url().refine((value) => new URL(value).protocol === "https:").optional(),
  ZALO_BOT_COMMUNITY_IMAGE_URL: z.url().refine((value) => new URL(value).protocol === "https:").optional(),
  ZALO_BOT_OFFER_IMAGE_URL: z.url().refine((value) => new URL(value).protocol === "https:").optional(),
  ZALO_BOT_REFERRAL_IMAGE_URL: z.url().refine((value) => new URL(value).protocol === "https:").optional(),
  ZALO_BOT_PREP_IMAGE_URL: z.url().refine((value) => new URL(value).protocol === "https:").optional(),
});

export const serverEnv = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  SIGNUP_RATE_LIMIT_SECRET: process.env.SIGNUP_RATE_LIMIT_SECRET || undefined,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
  ZALO_BOT_TOKEN: process.env.ZALO_BOT_TOKEN || undefined,
  ZALO_BOT_WEBHOOK_SECRET: process.env.ZALO_BOT_WEBHOOK_SECRET || undefined,
  ZALO_BOT_THANKS_IMAGE_URL: process.env.ZALO_BOT_THANKS_IMAGE_URL || undefined,
  ZALO_BOT_COMMUNITY_IMAGE_URL: process.env.ZALO_BOT_COMMUNITY_IMAGE_URL || undefined,
  ZALO_BOT_OFFER_IMAGE_URL: process.env.ZALO_BOT_OFFER_IMAGE_URL || undefined,
  ZALO_BOT_REFERRAL_IMAGE_URL: process.env.ZALO_BOT_REFERRAL_IMAGE_URL || undefined,
  ZALO_BOT_PREP_IMAGE_URL: process.env.ZALO_BOT_PREP_IMAGE_URL || undefined,
});
