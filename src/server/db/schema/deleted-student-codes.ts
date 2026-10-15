import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adSources, users } from "./users";

/** Permanent, append-only reservation. Contains no student contact or identity fields. */
export const deletedStudentCodes = pgTable("deleted_student_codes", {
  code: text().primaryKey(),
  sourceId: uuid().notNull().references(() => adSources.id),
  codeMonth: text().notNull(),
  seq: integer().notNull(),
  deletedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  deletedById: uuid().notNull().references(() => users.id),
  reason: text().notNull(),
}, table => [
  check("deleted_student_codes_format", sql`${table.code} ~ '^[A-Z][0-9]{2}(0[1-9]|1[0-2])[0-9]{3}$'`),
  check("deleted_student_codes_month", sql`${table.codeMonth} ~ '^[0-9]{2}(0[1-9]|1[0-2])$'`),
  check("deleted_student_codes_sequence", sql`${table.seq} BETWEEN 1 AND 999`),
  check("deleted_student_codes_reason", sql`length(btrim(${table.reason})) BETWEEN 1 AND 4000`),
]).enableRLS();
