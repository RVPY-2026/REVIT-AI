CREATE TYPE "public"."archive_reason" AS ENUM('spam', 'duplicate', 'test', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_channel" AS ENUM('call', 'zalo', 'meeting', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_outcome" AS ENUM('no_answer', 'interested', 'thinking', 'declined', 'other');--> statement-breakpoint
CREATE TYPE "public"."dropped_reason" AS ENUM('price', 'time', 'no_contact', 'other_course', 'not_interested', 'other');--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_sourceId_codeMonth_seq_unique";--> statement-breakpoint
ALTER TABLE "call_notes" ADD COLUMN "channel" "contact_channel" DEFAULT 'call' NOT NULL;--> statement-breakpoint
ALTER TABLE "call_notes" ADD COLUMN "outcome" "contact_outcome";--> statement-breakpoint
ALTER TABLE "call_notes" ADD COLUMN "next_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "call_notes" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "student_status_events" ADD COLUMN "reason" "dropped_reason";--> statement-breakpoint
ALTER TABLE "student_status_events" ADD COLUMN "kind" text DEFAULT 'status' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_status_events" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "archive_reason" "archive_reason";--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "archived_by_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_archived_by_id_users_id_fk" FOREIGN KEY ("archived_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "students_archived_at_index" ON "students" USING btree ("archived_at");--> statement-breakpoint
ALTER TABLE "student_status_events" ADD CONSTRAINT "student_events_kind" CHECK ("student_status_events"."kind" IN ('status', 'archive', 'restore', 'source_transfer'));--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_archive_state" CHECK (("students"."archived_at" IS NULL AND "students"."archive_reason" IS NULL) OR ("students"."archived_at" IS NOT NULL AND "students"."archive_reason" IS NOT NULL));
--> statement-breakpoint
-- Extension-free Vietnamese search, using PostgreSQL UTF-8 normalization.
CREATE FUNCTION rvpy_search_text(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN lower(translate(regexp_replace(normalize(value, NFD), U&'[\0300-\036f]', '', 'g'), 'Đđ', 'Dd'));
