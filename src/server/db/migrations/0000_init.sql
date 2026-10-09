CREATE TYPE "public"."enrollment_kind" AS ENUM('trial', 'formal');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind" AS ENUM('course', 'addin');--> statement-breakpoint
CREATE TYPE "public"."lesson_phase" AS ENUM('foundation', 'specialist');--> statement-breakpoint
CREATE TYPE "public"."license_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('payment', 'refund');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'cash', 'gateway');--> statement-breakpoint
CREATE TYPE "public"."resource_audience" AS ENUM('all', 'trial', 'formal');--> statement-breakpoint
CREATE TYPE "public"."resource_mode" AS ENUM('view', 'download');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'sale', 'student');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('new', 'consulting', 'trial', 'enrolled', 'dropped');--> statement-breakpoint
CREATE TABLE "ad_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_sources_code_unique" UNIQUE("code"),
	CONSTRAINT "ad_sources_code_format" CHECK ("ad_sources"."code" ~ '^[A-Z]$')
);
--> statement-breakpoint
ALTER TABLE "ad_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "source_month_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"code_month" text NOT NULL,
	"next_seq" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "source_month_counters_sourceId_codeMonth_unique" UNIQUE("source_id","code_month"),
	CONSTRAINT "source_month_counters_month_format" CHECK ("source_month_counters"."code_month" ~ '^[0-9]{2}(0[1-9]|1[0-2])$'),
	CONSTRAINT "source_month_counters_sequence_range" CHECK ("source_month_counters"."next_seq" BETWEEN 1 AND 1000)
);
--> statement-breakpoint
ALTER TABLE "source_month_counters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"auth_user_id" uuid,
	"name" text NOT NULL,
	"avatar_url" text,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_authUserId_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "call_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"body" text NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"from_status" "student_status",
	"to_status" "student_status" NOT NULL,
	"note" text,
	"changed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_status_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"code_month" text NOT NULL,
	"source_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"zalo_name" text,
	"occupation" text,
	"birth_year" integer,
	"specialty" text,
	"hometown" text,
	"organization" text,
	"legacy_label" text,
	"legacy_raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"zalo_friend_at" timestamp with time zone,
	"group1_at" timestamp with time zone,
	"group2_at" timestamp with time zone,
	"fee_sent_at" timestamp with time zone,
	"software_ready_at" timestamp with time zone,
	"official_zalo_at" timestamp with time zone,
	"signup_answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "student_status" DEFAULT 'new' NOT NULL,
	"referred_by_id" uuid,
	"user_id" uuid,
	"signed_up_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_code_unique" UNIQUE("code"),
	CONSTRAINT "students_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "students_sourceId_codeMonth_seq_unique" UNIQUE("source_id","code_month","seq"),
	CONSTRAINT "students_code_format" CHECK ("students"."code" ~ '^[A-Z][0-9]{2}(0[1-9]|1[0-2])[0-9]{3}$'),
	CONSTRAINT "students_month_format" CHECK ("students"."code_month" ~ '^[0-9]{2}(0[1-9]|1[0-2])$'),
	CONSTRAINT "students_sequence_range" CHECK ("students"."seq" BETWEEN 1 AND 999),
	CONSTRAINT "students_no_self_referral" CHECK ("students"."referred_by_id" IS NULL OR "students"."referred_by_id" <> "students"."id")
);
--> statement-breakpoint
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"email" text NOT NULL,
	"product" text NOT NULL,
	"status" "license_status" DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "licenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"amount_vnd" bigint NOT NULL,
	"enrollment_id" uuid,
	"kind" "payment_kind" DEFAULT 'payment' NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"method" "payment_method" DEFAULT 'bank_transfer' NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"note" text,
	"external_ref" text,
	"recorded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_externalRef_unique" UNIQUE("external_ref"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_vnd" > 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"for_status" "student_status",
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" "enrollment_kind" DEFAULT 'trial' NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"duration_multiplier" double precision DEFAULT 1 NOT NULL,
	"agreed_fee_vnd" bigint,
	"fee_note" text,
	"availability" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"project_brief" text,
	"trial_started_at" timestamp with time zone,
	"trial_expires_at" timestamp with time zone,
	"formal_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_studentId_unique" UNIQUE("student_id"),
	CONSTRAINT "enrollments_id_studentId_unique" UNIQUE("id","student_id"),
	CONSTRAINT "enrollments_multiplier_range" CHECK ("enrollments"."duration_multiplier" > 0 AND "enrollments"."duration_multiplier" <= 100),
	CONSTRAINT "enrollments_fee_nonnegative" CHECK ("enrollments"."agreed_fee_vnd" IS NULL OR "enrollments"."agreed_fee_vnd" >= 0),
	CONSTRAINT "enrollments_trial_dates" CHECK ("enrollments"."trial_expires_at" IS NULL OR ("enrollments"."trial_started_at" IS NOT NULL AND "enrollments"."trial_expires_at" > "enrollments"."trial_started_at"))
);
--> statement-breakpoint
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "learning_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid,
	"title" text NOT NULL,
	"bucket" text,
	"object_path" text,
	"external_url" text,
	"audience" "resource_audience" DEFAULT 'formal' NOT NULL,
	"mode" "resource_mode" DEFAULT 'view' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "learning_resources_one_origin" CHECK (("learning_resources"."object_path" IS NOT NULL AND length(trim("learning_resources"."object_path")) > 0 AND "learning_resources"."bucket" IS NOT NULL AND length(trim("learning_resources"."bucket")) > 0 AND "learning_resources"."external_url" IS NULL) OR ("learning_resources"."object_path" IS NULL AND "learning_resources"."bucket" IS NULL AND "learning_resources"."external_url" IS NOT NULL)),
	CONSTRAINT "learning_resources_external_provider" CHECK ("learning_resources"."external_url" IS NULL OR ("learning_resources"."mode" = 'view' AND "learning_resources"."external_url" ~ '^https://(www[.])?(youtube[.]com|youtube-nocookie[.]com)/embed/[A-Za-z0-9_-]{11}$'))
);
--> statement-breakpoint
ALTER TABLE "learning_resources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" "lesson_phase" DEFAULT 'foundation' NOT NULL,
	"lesson_numbers" integer[] DEFAULT '{}' NOT NULL,
	"title" text NOT NULL,
	"base_days" integer,
	"sort_order" integer NOT NULL,
	"trial_order" integer,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "lessons_trialOrder_unique" UNIQUE("trial_order"),
	CONSTRAINT "lessons_phase_sortOrder_unique" UNIQUE("phase","sort_order"),
	CONSTRAINT "lessons_duration_range" CHECK ("lessons"."base_days" IS NULL OR "lessons"."base_days" BETWEEN 0 AND 3650),
	CONSTRAINT "lessons_trial_order_range" CHECK ("lessons"."trial_order" IS NULL OR ("lessons"."phase" = 'foundation' AND "lessons"."trial_order" BETWEEN 1 AND 3))
);
--> statement-breakpoint
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "study_plan_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"lesson_id" uuid,
	"phase" "lesson_phase" NOT NULL,
	"lesson_numbers" integer[] DEFAULT '{}' NOT NULL,
	"title" text NOT NULL,
	"base_days" integer,
	"sort_order" integer NOT NULL,
	"trial_order" integer,
	"priority" boolean DEFAULT false NOT NULL,
	"due_date_override" date,
	"progress_note" text,
	"submission_url" text,
	"reported_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "study_plan_lessons_enrollmentId_phase_sortOrder_unique" UNIQUE("enrollment_id","phase","sort_order"),
	CONSTRAINT "study_plan_lessons_enrollmentId_lessonId_unique" UNIQUE("enrollment_id","lesson_id"),
	CONSTRAINT "study_plan_lessons_enrollmentId_trialOrder_unique" UNIQUE("enrollment_id","trial_order"),
	CONSTRAINT "study_plan_lessons_duration_range" CHECK ("study_plan_lessons"."base_days" IS NULL OR "study_plan_lessons"."base_days" BETWEEN 0 AND 3650),
	CONSTRAINT "study_plan_lessons_trial_order_range" CHECK ("study_plan_lessons"."trial_order" IS NULL OR ("study_plan_lessons"."phase" = 'foundation' AND "study_plan_lessons"."trial_order" BETWEEN 1 AND 3))
);
--> statement-breakpoint
ALTER TABLE "study_plan_lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"student_id" uuid,
	"respondent_name" text,
	"subject" text,
	"discipline" text,
	"teaching_speed" text,
	"curriculum_score" integer,
	"teaching_score" integer,
	"assistant_score" integer,
	"addin_score" integer,
	"body" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_scores_range" CHECK (("feedback"."curriculum_score" IS NULL OR "feedback"."curriculum_score" BETWEEN 1 AND 10)
    AND ("feedback"."teaching_score" IS NULL OR "feedback"."teaching_score" BETWEEN 1 AND 10)
    AND ("feedback"."assistant_score" IS NULL OR "feedback"."assistant_score" BETWEEN 1 AND 10)
    AND ("feedback"."addin_score" IS NULL OR "feedback"."addin_score" BETWEEN 1 AND 10))
);
--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ad_sources" ADD CONSTRAINT "ad_sources_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_month_counters" ADD CONSTRAINT "source_month_counters_source_id_ad_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ad_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_notes" ADD CONSTRAINT "call_notes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_notes" ADD CONSTRAINT "call_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_status_events" ADD CONSTRAINT "student_status_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_status_events" ADD CONSTRAINT "student_status_events_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_source_id_ad_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ad_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_referred_by_id_students_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_student_fk" FOREIGN KEY ("enrollment_id","student_id") REFERENCES "public"."enrollments"("id","student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_resources" ADD CONSTRAINT "learning_resources_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_lessons" ADD CONSTRAINT "study_plan_lessons_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plan_lessons" ADD CONSTRAINT "study_plan_lessons_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_sources_owner_user_id_index" ON "ad_sources" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "call_notes_student_id_index" ON "call_notes" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_status_events_student_id_index" ON "student_status_events" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "students_source_id_signed_up_at_index" ON "students" USING btree ("source_id","signed_up_at");--> statement-breakpoint
CREATE INDEX "students_referred_by_id_index" ON "students" USING btree ("referred_by_id");--> statement-breakpoint
CREATE INDEX "students_status_index" ON "students" USING btree ("status");--> statement-breakpoint
CREATE INDEX "students_phone_index" ON "students" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "students_signed_up_at_index" ON "students" USING btree ("signed_up_at");--> statement-breakpoint
CREATE INDEX "licenses_email_index" ON "licenses" USING btree ("email");--> statement-breakpoint
CREATE INDEX "payments_student_id_index" ON "payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "payments_enrollment_id_index" ON "payments" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_index" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "learning_resources_lesson_id_index" ON "learning_resources" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "study_plan_lessons_lesson_id_index" ON "study_plan_lessons" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "feedback_student_id_index" ON "feedback" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "feedback_kind_submitted_at_index" ON "feedback" USING btree ("kind","submitted_at");