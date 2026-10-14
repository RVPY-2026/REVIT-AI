import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { studentStatusEnum, archiveReasonEnum, droppedReasonEnum, contactChannelEnum, contactOutcomeEnum } from "./enums";
import { adSources, users } from "./users";

/** A lead from the sign-up form; the same row becomes the student once they enroll. */
export const students = pgTable(
  "students",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(), // source + YYMM + 3-digit sequence, e.g. A2610007
    codeMonth: text().notNull(),
    sourceId: uuid()
      .notNull()
      .references(() => adSources.id),
    seq: integer().notNull(),
    fullName: text().notNull(),
    phone: text().notNull(), // digits only, e.g. 0901234567
    email: text(), // lowercase Gmail
    zaloName: text(),
    occupation: text(),
    birthYear: integer(),
    specialty: text(),
    hometown: text(),
    organization: text(),
    legacyLabel: text(),
    legacyRaw: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    zaloFriendAt: timestamp({ withTimezone: true }),
    group1At: timestamp({ withTimezone: true }),
    group2At: timestamp({ withTimezone: true }),
    feeSentAt: timestamp({ withTimezone: true }),
    softwareReadyAt: timestamp({ withTimezone: true }),
    officialZaloAt: timestamp({ withTimezone: true }),
    // Remaining sign-up form answers (how they heard about RVPY, experience…).
    signupAnswers: jsonb().$type<Record<string, string>>().notNull().default({}),
    status: studentStatusEnum().notNull().default("new"),
    archivedAt: timestamp({ withTimezone: true }),
    archiveReason: archiveReasonEnum(),
    archivedById: uuid().references(() => users.id, { onDelete: "set null" }),
    referredById: uuid().references((): AnyPgColumn => students.id, { onDelete: "set null" }), // the referrer (§7 referral offer)
    userId: uuid().unique().references(() => users.id, { onDelete: "set null" }), // set when activated for sign-in
    signedUpAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // sourceId is current ownership, not the immutable source embedded in the code.
    check("students_archive_state", sql`(${t.archivedAt} IS NULL AND ${t.archiveReason} IS NULL) OR (${t.archivedAt} IS NOT NULL AND ${t.archiveReason} IS NOT NULL)`),
    index().on(t.archivedAt),
    check("students_code_format", sql`${t.code} ~ '^[A-Z][0-9]{2}(0[1-9]|1[0-2])[0-9]{3}$'`),
    check("students_month_format", sql`${t.codeMonth} ~ '^[0-9]{2}(0[1-9]|1[0-2])$'`),
    check("students_sequence_range", sql`${t.seq} BETWEEN 1 AND 999`),
    check("students_no_self_referral", sql`${t.referredById} IS NULL OR ${t.referredById} <> ${t.id}`),
    index().on(t.sourceId, t.signedUpAt),
    index().on(t.referredById),
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
    reason: droppedReasonEnum(),
    kind: text({ enum: ["status", "archive", "restore", "source_transfer"] }).notNull().default("status"),
    data: jsonb().$type<Record<string, string>>(),
    changedById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.studentId), check("student_events_kind", sql`${t.kind} IN ('status', 'archive', 'restore', 'source_transfer')`)],
).enableRLS();

export const callNotes = pgTable(
  "call_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    body: text().notNull(),
    channel: contactChannelEnum().notNull().default("call"),
    outcome: contactOutcomeEnum(),
    nextActionAt: timestamp({ withTimezone: true }),
    editedAt: timestamp({ withTimezone: true }),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.studentId)],
).enableRLS();
