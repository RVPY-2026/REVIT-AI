ALTER FUNCTION public.rvpy_search_text(text) SET search_path = '';
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.rvpy_search_text(text) FROM PUBLIC;
--> statement-breakpoint
-- Supabase API roles exist in production, but isolated Postgres fixtures may omit them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rvpy_search_text(text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rvpy_search_text(text) FROM authenticated;
  END IF;
END;
$$;
