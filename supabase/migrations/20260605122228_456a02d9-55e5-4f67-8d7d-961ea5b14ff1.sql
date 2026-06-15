-- handle_new_user is a trigger fired by auth.users; no client should call it directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- update_updated_at_column is a generic trigger function; no client should call it directly
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- NOTE: public.has_role(uuid, app_role) intentionally remains executable by authenticated
-- because RLS policies (e.g. admin checks) evaluate it as the querying role.