CREATE TABLE "lead_signup_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_signup_sessions_studentId_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "lead_signup_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "signup_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"used" integer NOT NULL,
	"resets_at" timestamp with time zone NOT NULL,
	CONSTRAINT "signup_rate_limits_used_positive" CHECK ("signup_rate_limits"."used" > 0)
);
--> statement-breakpoint
ALTER TABLE "signup_rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "zalo_bot_connections" ADD COLUMN "code_issued_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_signup_sessions" ADD CONSTRAINT "lead_signup_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_signup_sessions_expires_at_index" ON "lead_signup_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "signup_rate_limits_resets_at_index" ON "signup_rate_limits" USING btree ("resets_at");