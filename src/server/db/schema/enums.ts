import { pgEnum } from "drizzle-orm/pg-core";
import { STUDENT_STATUSES } from "../../../lib/constants";

export const roleEnum = pgEnum("role", ["admin", "sale", "student"]);

// Pipeline from CLAUDE.md §6, shared with the UI labels in lib/constants.ts.
// Relative import: drizzle-kit loads this file outside Next.js.
export const studentStatusEnum = pgEnum("student_status", STUDENT_STATUSES);

export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "cash", "gateway"]);

export const licenseStatusEnum = pgEnum("license_status", ["active", "expired", "revoked"]);

export const lessonPhaseEnum = pgEnum("lesson_phase", ["foundation", "specialist"]);
export const enrollmentKindEnum = pgEnum("enrollment_kind", ["trial", "formal"]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ["active", "paused", "completed", "cancelled"]);
export const paymentKindEnum = pgEnum("payment_kind", ["payment", "refund"]);
export const feedbackKindEnum = pgEnum("feedback_kind", ["course", "addin"]);
export const resourceAudienceEnum = pgEnum("resource_audience", ["all", "trial", "formal"]);
export const resourceModeEnum = pgEnum("resource_mode", ["view", "download"]);
