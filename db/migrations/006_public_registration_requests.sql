-- Public registration intake. Accounts are created only after manual Company Super Admin review.
ALTER TABLE app_organizations ADD COLUMN IF NOT EXISTS gst_number text;
CREATE UNIQUE INDEX IF NOT EXISTS app_organizations_gst_number_unique
  ON app_organizations(gst_number) WHERE gst_number IS NOT NULL AND gst_number <> '';

CREATE TABLE IF NOT EXISTS app_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  mobile_e164 text NOT NULL UNIQUE CHECK (mobile_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  requested_role text NOT NULL CHECK (requested_role IN ('CONTRACTOR','LABOUR_CONTRACTOR','MACHINE_OWNER','DRIVER','OPERATOR','PUBLIC_USER')),
  organization_name text,
  gst_number text,
  password_hash text,
  ip_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    requested_role NOT IN ('CONTRACTOR','LABOUR_CONTRACTOR') OR
    (organization_name IS NOT NULL AND length(trim(organization_name)) >= 2 AND gst_number IS NOT NULL
      AND gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
  ),
  CHECK (status <> 'PENDING' OR password_hash IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS app_registration_requests_status_created
  ON app_registration_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS app_registration_requests_ip_created
  ON app_registration_requests(ip_fingerprint, created_at DESC);
ALTER TABLE app_registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_registration_requests FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON app_registration_requests TO siteseva_app;
CREATE POLICY registration_request_public_insert ON app_registration_requests
  FOR INSERT TO siteseva_app WITH CHECK (status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE POLICY registration_request_admin_read ON app_registration_requests
  FOR SELECT TO siteseva_app USING (current_setting('app.is_super_admin', true)='true');
CREATE POLICY registration_request_admin_update ON app_registration_requests
  FOR UPDATE TO siteseva_app USING (current_setting('app.is_super_admin', true)='true')
  WITH CHECK (current_setting('app.is_super_admin', true)='true');
