import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { studentStatusEnum } from "./enums";
import { users } from "./users";

/**
 * Scripted Zalo messages. `body` uses {{placeholders}} (see BACKEND_RULES §6),
 * filled server-side with the student's data; staff copy and send by hand.
 */
export const messageTemplates = pgTable("message_templates", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  forStatus: studentStatusEnum(), // suggested as "next message" at this status
  body: text().notNull(),
  sortOrder: integer().notNull().default(0),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

/** Who did what to which record. Written by every mutation in src/server/actions. */
export const auditLog = pgTable("audit_log", {
  id: uuid().primaryKey().defaultRandom(),
  actorId: uuid().references(() => users.id, { onDelete: "set null" }),
  action: text().notNull(), // e.g. "student.status_changed"
  entity: text().notNull(), // table name
  entityId: uuid(),
  data: jsonb().$type<Record<string, unknown>>(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
