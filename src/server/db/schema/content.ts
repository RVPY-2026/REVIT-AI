import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
}, (t) => [
  index("audit_log_created_id_index").on(t.createdAt.desc(), t.id.desc()),
  index("audit_log_entity_id_index").on(t.entity, t.entityId),
  index("audit_log_action_created_index").on(t.action, t.createdAt.desc()),
  index("audit_log_actor_created_index").on(t.actorId, t.createdAt.desc()),
]).enableRLS();
