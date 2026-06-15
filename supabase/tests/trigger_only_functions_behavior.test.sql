-- Behavioral test: trigger-only SECURITY DEFINER functions must reject direct
-- calls from anon and authenticated. This complements the catalog-based
-- privilege check in has_role_permissions.test.sql by actually attempting the
-- call and asserting Postgres raises insufficient_privilege (SQLSTATE 42501).
--
-- Run with:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/tests/trigger_only_functions_behavior.test.sql
--
-- Everything runs inside a single transaction and is ROLLBACKed at the end.

\set ON_ERROR_STOP on
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert(cond boolean, msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN
    RAISE EXCEPTION 'ASSERT FAILED: %', msg;
  END IF;
END
$$;

-- ============================================================
-- 1. authenticated cannot directly invoke handle_new_user()
-- ============================================================
DO $$
DECLARE
  blocked boolean := false;
BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.handle_new_user();
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  RESET ROLE;

  PERFORM pg_temp.assert(blocked,
    'authenticated MUST be rejected when calling handle_new_user() directly');
  RAISE NOTICE 'OK 1: authenticated cannot invoke handle_new_user()';
END $$;

-- ============================================================
-- 2. anon cannot directly invoke handle_new_user()
-- ============================================================
DO $$
DECLARE
  blocked boolean := false;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.handle_new_user();
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  RESET ROLE;

  PERFORM pg_temp.assert(blocked,
    'anon MUST be rejected when calling handle_new_user() directly');
  RAISE NOTICE 'OK 2: anon cannot invoke handle_new_user()';
END $$;

-- ============================================================
-- 3. authenticated cannot directly invoke update_updated_at_column()
-- ============================================================
DO $$
DECLARE
  blocked boolean := false;
BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.update_updated_at_column();
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  RESET ROLE;

  PERFORM pg_temp.assert(blocked,
    'authenticated MUST be rejected when calling update_updated_at_column() directly');
  RAISE NOTICE 'OK 3: authenticated cannot invoke update_updated_at_column()';
END $$;

-- ============================================================
-- 4. anon cannot directly invoke update_updated_at_column()
-- ============================================================
DO $$
DECLARE
  blocked boolean := false;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.update_updated_at_column();
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  RESET ROLE;

  PERFORM pg_temp.assert(blocked,
    'anon MUST be rejected when calling update_updated_at_column() directly');
  RAISE NOTICE 'OK 4: anon cannot invoke update_updated_at_column()';
END $$;

-- ============================================================
-- 5. Sanity: authenticated CAN still call has_role() (intentional).
--    If this ever starts failing, every role-gated RLS policy breaks.
-- ============================================================
DO $$
DECLARE
  ok boolean;
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" =
    '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
  -- We don't care about the return value (likely false for a synthetic uuid),
  -- only that the call is permitted.
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO ok;
  RESET ROLE;
  RAISE NOTICE 'OK 5: authenticated can still invoke has_role() (returned %)', ok;
END $$;

ROLLBACK;

\echo ''
\echo '========================================='
\echo '  ALL TRIGGER-ONLY BEHAVIOR TESTS PASSED'
\echo '========================================='
