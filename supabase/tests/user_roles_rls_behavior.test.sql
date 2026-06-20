-- Behavioral RLS tests for public.user_roles + recursion guard for has_role().
-- Run with:  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/user_roles_rls_behavior.test.sql
--
-- Strategy:
--   * Seed two synthetic users (regular + admin) directly as postgres (bypassing RLS).
--   * SET LOCAL ROLE authenticated and SET LOCAL "request.jwt.claims" so auth.uid()
--     resolves to the synthetic user — this is exactly how PostgREST executes
--     requests from signed-in users.
--   * Verify RLS filters rows correctly, has_role() returns the right boolean,
--     and no "infinite recursion detected in policy" error is raised when
--     authenticated touches user_roles.
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

-- Stable synthetic UUIDs so failures are easy to read.
\set user_id    '''11111111-1111-1111-1111-111111111111'''
\set admin_id   '''22222222-2222-2222-2222-222222222222'''
\set other_id   '''33333333-3333-3333-3333-333333333333'''

-- ---------- Seed data as postgres (RLS-bypassing) ----------
-- auth.users rows are required so foreign-keyless joins / auth.uid() lookups
-- behave realistically. We insert directly because auth.users has no FK from
-- user_roles in this schema, but seeding keeps the fixture self-documenting.
INSERT INTO auth.users (id, email, instance_id, aud, role)
VALUES
  (:user_id ::uuid,  'user@test.local',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  (:admin_id::uuid,  'admin@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  (:other_id::uuid,  'other@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  (:user_id ::uuid, 'user'),
  (:admin_id::uuid, 'user'),
  (:admin_id::uuid, 'admin'),
  (:other_id::uuid, 'user')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 1. anon role: zero visibility into user_roles
-- ============================================================
DO $$
DECLARE
  cnt int;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    SELECT count(*) INTO cnt FROM public.user_roles;
    -- If we got here, anon could SELECT. Either no rows visible (RLS) OR a
    -- permission error. Either way, cnt must be 0.
    PERFORM pg_temp.assert(cnt = 0, format('anon must see 0 user_roles rows, saw %s', cnt));
  EXCEPTION WHEN insufficient_privilege THEN
    -- Acceptable: GRANT was not given to anon at all.
    NULL;
  END;
  RESET ROLE;
  RAISE NOTICE 'OK 1: anon sees nothing in user_roles';
END $$;

-- ============================================================
-- 2. authenticated regular user: sees ONLY their own role rows
-- ============================================================
DO $$
DECLARE
  cnt int;
  own_cnt int;
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

  SELECT count(*) INTO cnt     FROM public.user_roles;
  SELECT count(*) INTO own_cnt FROM public.user_roles WHERE user_id = auth.uid();

  PERFORM pg_temp.assert(cnt = 1,
    format('regular user must see exactly 1 row (their own), saw %s', cnt));
  PERFORM pg_temp.assert(own_cnt = 1,
    'regular user must see their own user_roles row');

  RESET ROLE;
  RAISE NOTICE 'OK 2: regular user sees only their own user_roles row';
END $$;

-- ============================================================
-- 3. authenticated admin: sees ALL rows via "Admins can view all roles"
-- ============================================================
DO $$
DECLARE
  cnt int;
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

  SELECT count(*) INTO cnt FROM public.user_roles;
  PERFORM pg_temp.assert(cnt >= 4,
    format('admin must see all seeded user_roles rows (>=4), saw %s', cnt));

  RESET ROLE;
  RAISE NOTICE 'OK 3: admin sees all user_roles rows';
END $$;

-- ============================================================
-- 4. has_role() returns correct boolean for authenticated callers
--    and does NOT recurse on user_roles policies.
-- ============================================================
DO $$
DECLARE
  is_admin_user  boolean;
  is_user_user   boolean;
  is_admin_admin boolean;
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

  -- Regular user: not admin, is user.
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin_user;
  SELECT public.has_role(auth.uid(), 'user'::public.app_role)  INTO is_user_user;
  PERFORM pg_temp.assert(is_admin_user IS FALSE, 'regular user must NOT be admin');
  PERFORM pg_temp.assert(is_user_user  IS TRUE,  'regular user must have role=user');

  -- Switch JWT to admin.
  SET LOCAL "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role) INTO is_admin_admin;
  PERFORM pg_temp.assert(is_admin_admin IS TRUE, 'admin user must have role=admin');

  RESET ROLE;
  RAISE NOTICE 'OK 4: has_role returns correct boolean for authenticated callers (no recursion)';
END $$;

-- ============================================================
-- 5. Explicit recursion guard: running a query that *combines*
--    has_role() with a SELECT against user_roles in the SAME
--    authenticated session must not raise 42P17 ("infinite
--    recursion detected in policy for relation user_roles").
-- ============================================================
DO $$
DECLARE
  cnt int;
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

  BEGIN
    SELECT count(*) INTO cnt
    FROM public.user_roles
    WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

    PERFORM pg_temp.assert(cnt >= 4,
      format('admin querying user_roles via has_role() must see all rows, saw %s', cnt));
  EXCEPTION
    WHEN sqlstate '42P17' THEN
      RAISE EXCEPTION 'RECURSION DETECTED: has_role() triggered RLS recursion on user_roles';
  END;

  RESET ROLE;
  RAISE NOTICE 'OK 5: no RLS recursion when authenticated combines has_role + user_roles';
END $$;

-- ============================================================
-- 6. Non-admin authenticated user cannot INSERT/UPDATE/DELETE
--    on user_roles (only "Admins can manage roles" allows writes).
-- ============================================================
DO $$
DECLARE
  rows_affected int;
BEGIN
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

  -- INSERT should be silently filtered (0 rows) or rejected.
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin');
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    PERFORM pg_temp.assert(rows_affected = 0,
      'regular user must NOT be able to grant themselves admin via INSERT');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL; -- acceptable
  END;

  -- DELETE on own row should affect 0 rows (no DELETE policy for self).
  DELETE FROM public.user_roles WHERE user_id = auth.uid();
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  PERFORM pg_temp.assert(rows_affected = 0,
    'regular user must NOT be able to DELETE their own user_roles row');

  RESET ROLE;
  RAISE NOTICE 'OK 6: regular user cannot escalate to admin or delete role rows';
END $$;

ROLLBACK;

\echo ''
\echo '========================================='
\echo '  ALL RLS BEHAVIOR TESTS PASSED'
\echo '========================================='
