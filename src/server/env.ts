import "server-only";
import { z } from "zod";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

// Server-only secrets. Validated on first import so a missing variable fails loudly.
// In mock mode (no database yet) DATABASE_URL may be absent; nothing queries it then.
const schema = z.object({
  DATABASE_URL: useMock ? z.url().default("postgres://mock:mock@localhost:5432/mock") : z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(), // only for Storage admin tasks
  CRON_SECRET: z.string().min(16).optional(),
});

export const serverEnv = schema.parse(process.env);
