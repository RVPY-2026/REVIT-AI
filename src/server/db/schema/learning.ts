import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { enrollmentKindEnum, enrollmentStatusEnum, lessonPhaseEnum, resourceAudienceEnum, resourceModeEnum } from "./enums";
import { students } from "./students";

/** Editable lesson templates; personal plans copy their content, not their state. */
export const lessons = pgTable("lessons", {
  id: uuid().primaryKey().defaultRandom(),
  phase: lessonPhaseEnum().notNull().default("foundation"),
  lessonNumbers: integer().array().notNull().default([]), // supports combined rows 4/5, 7/8, 24/25
  title: text().notNull(),
  baseDays: integer(), // null means the source does not specify a duration
  sortOrder: integer().notNull(),
  trialOrder: integer().unique(), // 1/2/3 select lessons 2/13/14, not the first three topics
  active: boolean().notNull().default(true),
}, (t) => [
  unique().on(t.phase, t.sortOrder),
  check("lessons_duration_range", sql`${t.baseDays} IS NULL OR ${t.baseDays} BETWEEN 0 AND 3650`),
  check("lessons_trial_order_range", sql`${t.trialOrder} IS NULL OR (${t.phase} = 'foundation' AND ${t.trialOrder} BETWEEN 1 AND 3)`),
]).enableRLS();

/** One current enrollment in the RVPY suite; both phases belong to it. */
export const enrollments = pgTable("enrollments", {
  id: uuid().primaryKey().defaultRandom(),
  studentId: uuid().notNull().unique().references(() => students.id),
  kind: enrollmentKindEnum().notNull().default("trial"),
  status: enrollmentStatusEnum().notNull().default("active"),
  startDate: date({ mode: "string" }),
  durationMultiplier: doublePrecision().notNull().default(1),
  agreedFeeVnd: bigint({ mode: "number" }), // null = not agreed yet, rather than free
  feeNote: text(),
  availability: jsonb().$type<boolean[][]>().notNull().default([]), // [] = unspecified; otherwise 7 weekdays x 10 slots
  projectBrief: text(),
  trialStartedAt: timestamp({ withTimezone: true }),
  trialExpiresAt: timestamp({ withTimezone: true }),
  formalStartedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique().on(t.id, t.studentId),
  check("enrollments_multiplier_range", sql`${t.durationMultiplier} > 0 AND ${t.durationMultiplier} <= 100`),
  check("enrollments_fee_nonnegative", sql`${t.agreedFeeVnd} IS NULL OR ${t.agreedFeeVnd} >= 0`),
  check("enrollments_trial_dates", sql`${t.trialExpiresAt} IS NULL OR (${t.trialStartedAt} IS NOT NULL AND ${t.trialExpiresAt} > ${t.trialStartedAt})`),
]).enableRLS();

/** Snapshot rows are unaffected when the lesson template changes. */
export const studyPlanLessons = pgTable("study_plan_lessons", {
  id: uuid().primaryKey().defaultRandom(),
  enrollmentId: uuid().notNull().references(() => enrollments.id),
  lessonId: uuid().references(() => lessons.id, { onDelete: "set null" }),
  phase: lessonPhaseEnum().notNull(),
  lessonNumbers: integer().array().notNull().default([]),
  title: text().notNull(),
  baseDays: integer(),
  sortOrder: integer().notNull(),
  trialOrder: integer(),
  priority: boolean().notNull().default(false),
  dueDateOverride: date({ mode: "string" }), // null => start date + cumulative base days x multiplier
  progressNote: text(),
  submissionUrl: text(),
  reportedAt: timestamp({ withTimezone: true }),
  completedAt: timestamp({ withTimezone: true }),
}, (t) => [
  unique().on(t.enrollmentId, t.phase, t.sortOrder),
  unique().on(t.enrollmentId, t.lessonId),
  unique().on(t.enrollmentId, t.trialOrder),
  index().on(t.lessonId),
  check("study_plan_lessons_duration_range", sql`${t.baseDays} IS NULL OR ${t.baseDays} BETWEEN 0 AND 3650`),
  check("study_plan_lessons_trial_order_range", sql`${t.trialOrder} IS NULL OR (${t.phase} = 'foundation' AND ${t.trialOrder} BETWEEN 1 AND 3)`),
]).enableRLS();

export const learningResources = pgTable("learning_resources", {
  id: uuid().primaryKey().defaultRandom(),
  lessonId: uuid().references(() => lessons.id),
  title: text().notNull(),
  bucket: text(),
  objectPath: text(),
  externalUrl: text(),
  audience: resourceAudienceEnum().notNull().default("formal"),
  mode: resourceModeEnum().notNull().default("view"),
  sortOrder: integer().notNull().default(0),
  active: boolean().notNull().default(true),
}, (t) => [
  index().on(t.lessonId),
  check("learning_resources_one_origin", sql`(${t.objectPath} IS NOT NULL AND length(trim(${t.objectPath})) > 0 AND ${t.bucket} IS NOT NULL AND length(trim(${t.bucket})) > 0 AND ${t.externalUrl} IS NULL) OR (${t.objectPath} IS NULL AND ${t.bucket} IS NULL AND ${t.externalUrl} IS NOT NULL)`),
  check("learning_resources_external_provider", sql`${t.externalUrl} IS NULL OR (${t.mode} = 'view' AND ${t.externalUrl} ~ '^https://(www[.])?(youtube[.]com|youtube-nocookie[.]com)/embed/[A-Za-z0-9_-]{11}$')`),
]).enableRLS();
