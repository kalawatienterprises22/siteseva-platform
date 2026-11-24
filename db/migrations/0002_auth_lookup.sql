-- Narrow login lookup: the runtime can retrieve only one account by exact mobile.
CREATE OR REPLACE FUNCTION app_auth_lookup(p_mobile_e164 text)
RETURNS TABLE (
  id uuid,
  password_hash text,
  status text,
  failed_login_count integer,
  locked_until timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.password_hash, u.status, u.failed_login_count, u.locked_until
  FROM app_users AS u
  WHERE u.mobile_e164 = p_mobile_e164
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION app_auth_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_auth_lookup(text) TO siteseva_app;
GRANT SELECT ON app_login_attempts TO siteseva_app;
