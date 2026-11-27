-- First Company Super Admin bootstrap and TOTP MFA.
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS mfa_secret_ciphertext text,
  ADD COLUMN IF NOT EXISTS mfa_secret_iv text,
  ADD COLUMN IF NOT EXISTS mfa_secret_tag text,
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz;
CREATE TABLE IF NOT EXISTS app_bootstrap_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);
INSERT INTO app_bootstrap_state(id, completed) VALUES (true, false)
ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS app_admin_bootstrap_pending (
  id uuid PRIMARY KEY,
  mobile_e164 text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  mfa_secret_ciphertext text NOT NULL,
  mfa_secret_iv text NOT NULL,
  mfa_secret_tag text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_admin_bootstrap_pending_expiry
  ON app_admin_bootstrap_pending(expires_at);
GRANT SELECT, UPDATE ON app_bootstrap_state TO siteseva_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_admin_bootstrap_pending TO siteseva_app;
