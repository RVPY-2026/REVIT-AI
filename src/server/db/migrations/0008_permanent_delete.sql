CREATE TABLE "deleted_student_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"source_id" uuid NOT NULL,
	"code_month" text NOT NULL,
	"seq" integer NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_by_id" uuid NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "deleted_student_codes_format" CHECK ("deleted_student_codes"."code" ~ '^[A-Z][0-9]{2}(0[1-9]|1[0-2])[0-9]{3}$'),
	CONSTRAINT "deleted_student_codes_month" CHECK ("deleted_student_codes"."code_month" ~ '^[0-9]{2}(0[1-9]|1[0-2])$'),
	CONSTRAINT "deleted_student_codes_sequence" CHECK ("deleted_student_codes"."seq" BETWEEN 1 AND 999),
	CONSTRAINT "deleted_student_codes_reason" CHECK (length(btrim("deleted_student_codes"."reason")) BETWEEN 1 AND 4000)
);
--> statement-breakpoint
ALTER TABLE "deleted_student_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deleted_student_codes" ADD CONSTRAINT "deleted_student_codes_source_id_ad_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ad_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_student_codes" ADD CONSTRAINT "deleted_student_codes_deleted_by_id_users_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION public.rvpy_keep_deleted_student_codes() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Deleted student codes are append-only' USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.rvpy_keep_deleted_student_codes() FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rvpy_keep_deleted_student_codes() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rvpy_keep_deleted_student_codes() FROM authenticated;
  END IF;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER deleted_student_codes_no_changes
BEFORE UPDATE OR DELETE ON public.deleted_student_codes
FOR EACH ROW EXECUTE FUNCTION public.rvpy_keep_deleted_student_codes();
--> statement-breakpoint
CREATE TRIGGER deleted_student_codes_no_truncate
BEFORE TRUNCATE ON public.deleted_student_codes
FOR EACH STATEMENT EXECUTE FUNCTION public.rvpy_keep_deleted_student_codes();
