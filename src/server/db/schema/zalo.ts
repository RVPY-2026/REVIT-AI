import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { students } from "./students";

/** One-time opt-in code and private Bot conversation associated with a lead. */
export const zaloBotConnections = pgTable("zalo_bot_connections", {
  studentId: uuid().primaryKey().references(() => students.id, { onDelete: "cascade" }),
  linkTokenHash: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  codeIssuedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  chatId: text(),
  connectedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("zalo_bot_connections_chat_id_uq").on(t.chatId),
  index().on(t.expiresAt),
]).enableRLS();

/** Durable, ordered outbound queue. Message text contains approved course links only. */
export const zaloBotOutbox = pgTable("zalo_bot_outbox", {
  id: uuid().primaryKey().defaultRandom(),
  studentId: uuid().notNull().references(() => students.id, { onDelete: "cascade" }),
  chatId: text().notNull(),
  eventKey: text().notNull(),
  sequence: integer().notNull(),
  kind: text().notNull(), // text | photo
  body: text().notNull(),
  status: text().notNull().default("pending"), // pending | sent | failed
  attempts: integer().notNull().default(0),
  availableAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp({ withTimezone: true }),
  lastError: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("zalo_bot_outbox_event_key_uq").on(t.eventKey),
  index().on(t.status, t.availableAt, t.createdAt),
  check("zalo_bot_outbox_kind_check", sql`${t.kind} IN ('text', 'photo')`),
  check("zalo_bot_outbox_status_check", sql`${t.status} IN ('pending', 'sent', 'failed')`),
  check("zalo_bot_outbox_sequence_check", sql`${t.sequence} > 0`),
]).enableRLS();
