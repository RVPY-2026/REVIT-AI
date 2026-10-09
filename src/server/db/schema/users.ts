import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";

/**
 * People who may sign in. Rows are created by an admin (staff) or when a lead
 * is activated as a student — before that person ever signs in. On first
 * Google sign-in we match by email and fill `authUserId`.
 */
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(), // always stored lowercase
  authUserId: uuid().unique(), // auth.users.id from Supabase, null until first sign-in
  name: text().notNull(),
  avatarUrl: text(),
  disabledAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
).enableRLS();

/**
 * Lead sources: R = RVPY itself, A/B/C… = ad runners. A `sale` user sees only
 * students whose source they own. Counters are separate for each source/month.
 */
export const adSources = pgTable("ad_sources", {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(), // single uppercase letter
  name: text().notNull(),
  ownerUserId: uuid().references(() => users.id, { onDelete: "set null" }),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index().on(t.ownerUserId),
  check("ad_sources_code_format", sql`${t.code} ~ '^[A-Z]$'`),
]).enableRLS();

export const sourceMonthCounters = pgTable("source_month_counters", {
  id: uuid().primaryKey().defaultRandom(),
  sourceId: uuid().notNull().references(() => adSources.id),
  codeMonth: text().notNull(), // YYMM in Asia/Ho_Chi_Minh
  nextSeq: integer().notNull().default(1),
}, (t) => [
  unique().on(t.sourceId, t.codeMonth),
  check("source_month_counters_month_format", sql`${t.codeMonth} ~ '^[0-9]{2}(0[1-9]|1[0-2])$'`),
  check("source_month_counters_sequence_range", sql`${t.nextSeq} BETWEEN 1 AND 1000`),
]).enableRLS();
