import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/server/env";
import * as schema from "./schema";
import { POSTGRES_READ_CONNECTION_OPTIONS, POSTGRES_WRITE_CONNECTION_OPTIONS } from "./connection-options";

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres>; pgWriteClient?: ReturnType<typeof postgres>; pgUrl?: string; pgPoolVersion?: number };
const POOL_VERSION = 4;

// `prepare: false` is required by Supabase's transaction pooler (port 6543).
const canReuseClient = globalForDb.pgUrl === serverEnv.DATABASE_URL && globalForDb.pgPoolVersion === POOL_VERSION && Boolean(globalForDb.pgWriteClient);
if (!canReuseClient && globalForDb.pgClient) void globalForDb.pgClient.end({ timeout: 1 }).catch(() => undefined);
if (!canReuseClient && globalForDb.pgWriteClient) void globalForDb.pgWriteClient.end({ timeout: 1 }).catch(() => undefined);
const client = canReuseClient && globalForDb.pgClient
  ? globalForDb.pgClient : postgres(serverEnv.DATABASE_URL, POSTGRES_READ_CONNECTION_OPTIONS);
const writeClient = canReuseClient && globalForDb.pgWriteClient
  ? globalForDb.pgWriteClient : postgres(serverEnv.DATABASE_URL, POSTGRES_WRITE_CONNECTION_OPTIONS);
if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
  globalForDb.pgWriteClient = writeClient;
  globalForDb.pgUrl = serverEnv.DATABASE_URL;
  globalForDb.pgPoolVersion = POOL_VERSION;
}

/**
 * Connects as the database owner and therefore bypasses RLS.
 * Only import from src/server/** — every query must apply the caller's scope
 * (BACKEND_RULES §4).
 */
const readDb = drizzle({ client, schema, casing: "snake_case" });
const writeDb = drizzle({ client: writeClient, schema, casing: "snake_case" });
// All mutations already use db.transaction; reserve them on the write pool.
export const db = Object.assign(readDb, { transaction: writeDb.transaction.bind(writeDb) });
export type Db = typeof db;
