import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { licenseStatusEnum, paymentMethodEnum } from "./enums";
import { students } from "./students";
import { users } from "./users";

/** Admin-only. Amounts are whole VND. */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid()
      .notNull()
      .references(() => students.id),
    amountVnd: bigint({ mode: "number" }).notNull(),
    method: paymentMethodEnum().notNull().default("bank_transfer"),
    paidAt: timestamp({ withTimezone: true }).notNull(),
    note: text(),
    externalRef: text().unique(), // gateway transaction id, for idempotent webhooks
    recordedById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.studentId), index().on(t.paidAt)],
).enableRLS();

/** Add-in licenses, keyed by the Google email the add-in signs in with. Admin-only. */
export const licenses = pgTable(
  "licenses",
  {
    id: uuid().primaryKey().defaultRandom(),
    studentId: uuid().references(() => students.id, { onDelete: "set null" }),
    email: text().notNull(),
    product: text().notNull(), // e.g. "auto-join"; "suite" for everything
    status: licenseStatusEnum().notNull().default("active"),
    startsAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }), // null = no expiry
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.email)],
).enableRLS();
