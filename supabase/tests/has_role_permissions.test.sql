-- Automated permission tests for SECURITY DEFINER functions + user_roles RLS surface.
-- Run with:  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/has_role_permissions.test.sql
--
-- These tests use catalog privilege checks (has_function_privilege /
-- has_table_privilege) so they can be run from any role without needing
-- membership in anon/authenticated.
--
-- Verifies:
--   1. has_role(uuid, app_role)         -> EXECUTE granted ONLY to authenticated
--   2. handle_new_user()                -> no client role can EXECUTE (trigger-only)
--   3. update_updated_at_column()       -> no client role can EXECUTE (trigger-only)
--   4. public.user_roles                -> anon has NO table privileges; authenticated has SELECT
--   5. RLS is enabled on profiles and user_roles
--   6. Expected RLS policies exist on user_roles

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

-- ---------- 1. has_role ----------
DO $$
DECLARE
  fn regprocedure := 'public.has_role(uuid, public.app_role)'::regprocedure;
BEGIN
  PERFORM pg_temp.assert(
    has_function_privilege('authenticated', fn, 'EXECUTE'),
    'authenticated must have EXECUTE on has_role'
  );
  PERFORM pg_temp.assert(
    NOT has_function_privilege('anon', fn, 'EXECUTE'),
    'anon must NOT have EXECUTE on has_role'
  );
  PERFORM pg_temp.assert(
    NOT has_function_privilege('public', fn, 'EXECUTE'),
    'PUBLIC must NOT have EXECUTE on has_role'
  );
  RAISE NOTICE 'OK 1: has_role EXECUTE = authenticated only';
END $$;

-- ---------- 2. handle_new_user ----------
DO $$
DECLARE
  fn regprocedure := 'public.handle_new_user()'::regprocedure;
BEGIN
  PERFORM pg_temp.assert(NOT has_function_privilege('anon', fn, 'EXECUTE'),
    'anon must NOT have EXECUTE on handle_new_user');
  PERFORM pg_temp.assert(NOT has_function_privilege('authenticated', fn, 'EXECUTE'),
    'authenticated must NOT have EXECUTE on handle_new_user');
  PERFORM pg_temp.assert(NOT has_function_privilege('public', fn, 'EXECUTE'),
    'PUBLIC must NOT have EXECUTE on handle_new_user');
  RAISE NOTICE 'OK 2: handle_new_user is trigger-only';
END $$;

-- ---------- 3. update_updated_at_column ----------
DO $$
DECLARE
  fn regprocedure := 'public.update_updated_at_column()'::regprocedure;
BEGIN
  PERFORM pg_temp.assert(NOT has_function_privilege('anon', fn, 'EXECUTE'),
    'anon must NOT have EXECUTE on update_updated_at_column');
  PERFORM pg_temp.assert(NOT has_function_privilege('authenticated', fn, 'EXECUTE'),
    'authenticated must NOT have EXECUTE on update_updated_at_column');
  PERFORM pg_temp.assert(NOT has_function_privilege('public', fn, 'EXECUTE'),
    'PUBLIC must NOT have EXECUTE on update_updated_at_column');
  RAISE NOTICE 'OK 3: update_updated_at_column is trigger-only';
END $$;

-- ---------- 4. user_roles table grants ----------
DO $$
DECLARE
  tbl regclass := 'public.user_roles'::regclass;
BEGIN
  PERFORM pg_temp.assert(NOT has_table_privilege('anon', tbl, 'SELECT'),
    'anon must NOT have SELECT on user_roles');
  PERFORM pg_temp.assert(NOT has_table_privilege('anon', tbl, 'INSERT'),
    'anon must NOT have INSERT on user_roles');
  PERFORM pg_temp.assert(NOT has_table_privilege('anon', tbl, 'UPDATE'),
    'anon must NOT have UPDATE on user_roles');
  PERFORM pg_temp.assert(NOT has_table_privilege('anon', tbl, 'DELETE'),
    'anon must NOT have DELETE on user_roles');
  PERFORM pg_temp.assert(has_table_privilege('authenticated', tbl, 'SELECT'),
    'authenticated must have SELECT on user_roles (RLS still filters rows)');
  RAISE NOTICE 'OK 4: anon has no privileges on user_roles; authenticated can SELECT (RLS-filtered)';
END $$;

-- ---------- 5. RLS enabled ----------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('user_roles','profiles')
  LOOP
    PERFORM pg_temp.assert(r.relrowsecurity,
      'RLS must be enabled on public.' || r.relname);
  END LOOP;
  RAISE NOTICE 'OK 5: RLS enabled on profiles and user_roles';
END $$;

-- ---------- 6. Required policies present on user_roles ----------
DO $$
DECLARE
  expected text[] := ARRAY[
    'Users can view their own roles',
    'Admins can view all roles',
    'Admins can manage roles'
  ];
  p text;
  found int;
BEGIN
  FOREACH p IN ARRAY expected LOOP
    SELECT count(*) INTO found
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = p;
    PERFORM pg_temp.assert(found = 1,
      format('Missing required policy on user_roles: %s', p));
  END LOOP;
  RAISE NOTICE 'OK 6: all required policies present on user_roles';
END $$;

ROLLBACK;

\echo ''
\echo '========================================='
\echo '  ALL PERMISSION TESTS PASSED'
\echo '========================================='
