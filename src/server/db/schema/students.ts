import { type AnyPgColumn, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { studentStatusEnum } from "./enums";
import { adSources, users } from "./users";

/** A lead from the sign-up form; the same row becomes the student once they enroll. */
export const students = pgTable(
  "students",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(), // `${source.code}${seq}`, e.g. A15
    sourceId: uuid()
      .notNull()
      .references(() => adSources.id),
    seq: integer().notNull(),
    fullName: text().notNull(),
    phone: text().notNull(), // digits only, e.g. 0901234567
    email: text(), // lowercase Gmail
    zaloName: text(),
    occupation: text(),
    // Remaining sign-up form answers (how they heard about RVPY, experience…).
    signupAnswers: jsonb().$type<Record<string, string>>().notNull().default({}),
    status: studentStatusEnum().notNull().default("new"),
    referredById: uuid().references((): AnyPgColumn => students.id, { onDelete: "set null" }), // the referrer (§7 referral offer)
    userId: uuid().references(() => users.id, { onDelete: "set null" }), // set when activated for sign-in
    signedUpAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique().on(t.sourceId, t.seq),
    index().on(t.status),
    index().on(t.phone),
    index().on(t.signedUpAt),
  ],
).enableRLS();

/** Append-only history of pipeline changes — drives the profile timeline. */
export const studentStatusEvents = pgTable(
  "student_status_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    fromStatus: studentStatusEnum(),
    toStatus: studentStatusEnum().notNull(),
    note: text(),
    changedById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.studentId)],
).enableRLS();

export const callNotes = pgTable(
  "call_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    body: text().notNull(),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.studentId)],
).enableRLS();
