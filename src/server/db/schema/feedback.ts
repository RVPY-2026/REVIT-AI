import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { feedbackKindEnum } from "./enums";
import { students } from "./students";

/** Course feedback and add-in suggestions; legacy anonymous responses stay unlinked. */
export const feedback = pgTable("feedback", {
  id: uuid().primaryKey().defaultRandom(),
  kind: feedbackKindEnum().notNull(),
  studentId: uuid().references(() => students.id, { onDelete: "set null" }),
  respondentName: text(),
  subject: text(),
  discipline: text(),
  teachingSpeed: text(),
  curriculumScore: integer(),
  teachingScore: integer(),
  assistantScore: integer(),
  addinScore: integer(),
  body: text(),
  submittedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index().on(t.studentId),
  index().on(t.kind, t.submittedAt),
  check("feedback_scores_range", sql`(${t.curriculumScore} IS NULL OR ${t.curriculumScore} BETWEEN 1 AND 10)
    AND (${t.teachingScore} IS NULL OR ${t.teachingScore} BETWEEN 1 AND 10)
    AND (${t.assistantScore} IS NULL OR ${t.assistantScore} BETWEEN 1 AND 10)
    AND (${t.addinScore} IS NULL OR ${t.addinScore} BETWEEN 1 AND 10)`),
]).enableRLS();
