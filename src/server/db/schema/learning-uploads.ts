import { sql } from "drizzle-orm";
import { bigint, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Opaque, single-use upload reservations. Only the authorized uploader receives the signed destination. */
export const learningUploads = pgTable("learning_uploads", {
  id: uuid().primaryKey().defaultRandom(),
  actorId: uuid().notNull().references(() => users.id),
  filename: text().notNull(),
  objectPath: text().notNull().unique(),
  contentType: text().notNull(),
  size: bigint({ mode: "number" }).notNull(),
  mode: text().notNull(),
  status: text().notNull().default("pending"),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
}, (t) => [
  check("learning_uploads_size", sql`${t.size} > 0 AND ${t.size} <= 50000000`),
  check("learning_uploads_mode", sql`${t.mode} IN ('view', 'download')`),
  check("learning_uploads_status", sql`${t.status} IN ('pending', 'uploaded', 'consumed', 'cancelled', 'cleaned')`),
]).enableRLS();
