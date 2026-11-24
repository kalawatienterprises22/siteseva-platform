-- SiteSeva security foundation. Apply as the database owner only.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE app_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_roles_key_format CHECK (role_key ~ '^[A-Z_]{2,40}$')
);

CREATE TABLE app_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_permissions_key_format CHECK (permission_key ~ '^[a-z][a-z0-9_.]{2,100}$')
);

CREATE TABLE app_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_type text NOT NULL DEFAULT 'COMPANY',
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_e164 text NOT NULL UNIQUE,
  email text,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','LOCKED')),
  mfa_enabled boolean NOT NULL DEFAULT false,
  failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_users_mobile_format CHECK (mobile_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

CREATE TABLE app_org_memberships (
  organization_id uuid NOT NULL REFERENCES app_organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  membership_status text NOT NULL DEFAULT 'ACTIVE' CHECK (membership_status IN ('ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE app_user_roles (
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES app_roles(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES app_organizations(id) ON DELETE RESTRICT,
  granted_by uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id, organization_id)
);

CREATE TABLE app_role_permissions (
  role_id uuid NOT NULL REFERENCES app_roles(id) ON DELETE RESTRICT,
  permission_id uuid NOT NULL REFERENCES app_permissions(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ip_fingerprint text,
  user_agent_fingerprint text,
  CONSTRAINT app_sessions_expiry CHECK (expires_at > created_at)
);

CREATE TABLE app_login_attempts (
  id bigserial PRIMARY KEY,
  identifier_fingerprint text NOT NULL,
  ip_fingerprint text NOT NULL,
  succeeded boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_audit_logs (
  id bigserial PRIMARY KEY,
  request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  actor_role_key text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS','DENIED','FAILURE')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_users_status_idx ON app_users(status);
CREATE INDEX app_user_roles_user_idx ON app_user_roles(user_id);
CREATE INDEX app_user_roles_org_idx ON app_user_roles(organization_id);
CREATE INDEX app_sessions_user_expiry_idx ON app_sessions(user_id, expires_at);
CREATE INDEX app_sessions_expiry_idx ON app_sessions(expires_at);
CREATE INDEX app_login_attempts_lookup_idx ON app_login_attempts(identifier_fingerprint, ip_fingerprint, attempted_at DESC);
CREATE INDEX app_audit_logs_actor_created_idx ON app_audit_logs(actor_user_id, created_at DESC);
CREATE INDEX app_audit_logs_target_idx ON app_audit_logs(target_type, target_id, created_at DESC);

INSERT INTO app_roles (role_key, label) VALUES
  ('SUPER_ADMIN', 'Company Super Admin'),
  ('CONTRACTOR', 'Contractor'),
  ('MACHINE_OWNER', 'Machine / Vehicle Owner'),
  ('OPERATOR', 'Operator'),
  ('DRIVER', 'Driver'),
  ('PUBLIC_USER', 'Public User'),
  ('LABOUR_CONTRACTOR', 'Labour Contractor'),
  ('SITE_SUPERVISOR', 'Site Supervisor')
ON CONFLICT (role_key) DO NOTHING;

INSERT INTO app_permissions (permission_key, description) VALUES
  ('users.read', 'View users allowed by assigned scope'),
  ('users.approve', 'Approve eligible registrations'),
  ('users.suspend', 'Suspend users within assigned scope'),
  ('roles.assign', 'Assign roles within delegated authority'),
  ('organizations.manage', 'Manage organization records'),
  ('machines.read', 'View machines within assigned scope'),
  ('machines.manage', 'Manage owned or assigned machines'),
  ('logbook.read', 'View logbook entries within assigned scope'),
  ('logbook.submit', 'Submit daily machine logbook entries'),
  ('logbook.approve', 'Approve assigned logbook entries'),
  ('reports.read', 'View reports within assigned scope'),
  ('reports.export', 'Export authorized reports'),
  ('marketplace.manage', 'Moderate marketplace listings'),
  ('settings.manage', 'Manage platform settings'),
  ('audit.read', 'View security and audit history')
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION app_deny_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS app_audit_logs_no_update ON app_audit_logs;
CREATE TRIGGER app_audit_logs_no_update
BEFORE UPDATE OR DELETE ON app_audit_logs
FOR EACH ROW EXECUTE FUNCTION app_deny_audit_mutation();

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users FORCE ROW LEVEL SECURITY;
CREATE POLICY app_users_self_or_superadmin ON app_users
  USING (
    id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (
    id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

ALTER TABLE app_org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_org_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY app_membership_self_or_superadmin ON app_org_memberships
  USING (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

ALTER TABLE app_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY app_user_roles_self_or_superadmin ON app_user_roles
  USING (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (current_setting('app.is_super_admin', true) = 'true');

ALTER TABLE app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY app_sessions_self_or_superadmin ON app_sessions
  USING (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (
    user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

ALTER TABLE app_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY app_audit_logs_read ON app_audit_logs
  FOR SELECT USING (
    actor_user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );
CREATE POLICY app_audit_logs_insert ON app_audit_logs
  FOR INSERT WITH CHECK (
    actor_user_id = nullif(current_setting('app.user_id', true), '')::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- Runtime role gets only the explicit application permissions, never schema ownership.
GRANT SELECT ON app_roles, app_permissions, app_role_permissions TO siteseva_app;
GRANT SELECT, INSERT, UPDATE ON app_users TO siteseva_app;
GRANT SELECT, INSERT, UPDATE ON app_org_memberships, app_user_roles TO siteseva_app;
GRANT SELECT, INSERT, UPDATE ON app_sessions TO siteseva_app;
GRANT SELECT, INSERT ON app_login_attempts, app_audit_logs TO siteseva_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siteseva_app;
