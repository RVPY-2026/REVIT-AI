import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { students } from "./students";

/** Browser-held proof of a signup, independent of the short-lived Zalo code. */
export const leadSignupSessions = pgTable("lead_signup_sessions", {
  tokenHash: text().primaryKey(),
  studentId: uuid().notNull().unique().references(() => students.id),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [index().on(t.expiresAt)]).enableRLS();

/** Shared fixed-window counters. Keys are hashed; raw IPs and phones are not stored. */
export const signupRateLimits = pgTable("signup_rate_limits", {
  keyHash: text().primaryKey(),
  used: integer().notNull(),
  resetsAt: timestamp({ withTimezone: true }).notNull(),
}, (t) => [
  index().on(t.resetsAt),
  check("signup_rate_limits_used_positive", sql`${t.used} > 0`),
]).enableRLS();
