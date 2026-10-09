import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/server/env";
import * as schema from "./schema";

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres>; pgUrl?: string };

// `prepare: false` is required by Supabase's transaction pooler (port 6543).
const client = globalForDb.pgUrl === serverEnv.DATABASE_URL && globalForDb.pgClient
  ? globalForDb.pgClient : postgres(serverEnv.DATABASE_URL, { prepare: false });
if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
  globalForDb.pgUrl = serverEnv.DATABASE_URL;
}

/**
 * Connects as the database owner and therefore bypasses RLS.
 * Only import from src/server/** — every query must apply the caller's scope
 * (BACKEND_RULES §4).
 */
export const db = drizzle({ client, schema, casing: "snake_case" });
export type Db = typeof db;
