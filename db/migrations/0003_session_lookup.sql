-- Session lookup returns only the owner of a matching hashed opaque token.
CREATE OR REPLACE FUNCTION app_session_lookup(p_token_hash text)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  user_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.status
  FROM app_sessions AS s
  JOIN app_users AS u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION app_session_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_session_lookup(text) TO siteseva_app;
