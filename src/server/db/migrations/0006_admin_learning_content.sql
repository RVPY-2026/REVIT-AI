CREATE TABLE "learning_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"object_path" text NOT NULL,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"mode" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "learning_uploads_objectPath_unique" UNIQUE("object_path"),
	CONSTRAINT "learning_uploads_size" CHECK ("learning_uploads"."size" > 0 AND "learning_uploads"."size" <= 104857600),
	CONSTRAINT "learning_uploads_mode" CHECK ("learning_uploads"."mode" IN ('view', 'download')),
	CONSTRAINT "learning_uploads_status" CHECK ("learning_uploads"."status" IN ('pending', 'uploaded', 'consumed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "learning_uploads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "learning_uploads" ADD CONSTRAINT "learning_uploads_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;