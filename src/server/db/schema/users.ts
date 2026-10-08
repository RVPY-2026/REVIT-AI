import { boolean, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
 * students whose source they own. `nextSeq` hands out student codes (A15, R21).
 */
export const adSources = pgTable("ad_sources", {
  id: uuid().primaryKey().defaultRandom(),
  code: text().notNull().unique(), // single uppercase letter
  name: text().notNull(),
  ownerUserId: uuid().references(() => users.id, { onDelete: "set null" }),
  nextSeq: integer().notNull().default(1),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
