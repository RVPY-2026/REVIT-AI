import { pgEnum } from "drizzle-orm/pg-core";
import { STUDENT_STATUSES } from "../../../lib/constants";

export const roleEnum = pgEnum("role", ["admin", "sale", "student"]);

// Pipeline from CLAUDE.md §6, shared with the UI labels in lib/constants.ts.
// Relative import: drizzle-kit loads this file outside Next.js.
export const studentStatusEnum = pgEnum("student_status", STUDENT_STATUSES);

export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "cash", "gateway"]);

export const licenseStatusEnum = pgEnum("license_status", ["active", "expired", "revoked"]);
