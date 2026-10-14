CREATE TABLE "zalo_bot_connections" (
	"student_id" uuid PRIMARY KEY NOT NULL,
	"link_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"chat_id" text,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zalo_bot_connections_linkTokenHash_unique" UNIQUE("link_token_hash")
);
--> statement-breakpoint
ALTER TABLE "zalo_bot_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "zalo_bot_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"chat_id" text NOT NULL,
	"event_key" text NOT NULL,
	"sequence" integer NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zalo_bot_outbox_kind_check" CHECK ("zalo_bot_outbox"."kind" IN ('text', 'photo')),
	CONSTRAINT "zalo_bot_outbox_status_check" CHECK ("zalo_bot_outbox"."status" IN ('pending', 'sent', 'failed')),
	CONSTRAINT "zalo_bot_outbox_sequence_check" CHECK ("zalo_bot_outbox"."sequence" > 0)
);
--> statement-breakpoint
ALTER TABLE "zalo_bot_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "zalo_bot_connections" ADD CONSTRAINT "zalo_bot_connections_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zalo_bot_outbox" ADD CONSTRAINT "zalo_bot_outbox_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "zalo_bot_connections_chat_id_uq" ON "zalo_bot_connections" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "zalo_bot_connections_expires_at_index" ON "zalo_bot_connections" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "zalo_bot_outbox_event_key_uq" ON "zalo_bot_outbox" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "zalo_bot_outbox_status_available_at_created_at_index" ON "zalo_bot_outbox" USING btree ("status","available_at","created_at");