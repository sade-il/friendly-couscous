-- profiles: revoke broad anon access, keep authenticated minimal, service_role full
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- user_roles: revoke broad anon access, keep authenticated minimal, service_role full
REVOKE ALL ON TABLE public.user_roles FROM anon;
REVOKE ALL ON TABLE public.user_roles FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;