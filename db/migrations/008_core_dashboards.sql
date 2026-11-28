-- Additive core dashboard foundation. Existing records and routes are preserved.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'hi';
ALTER TABLE app_organizations ADD COLUMN IF NOT EXISTS business_phone text;
ALTER TABLE app_organizations ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE app_organizations ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE app_organizations ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE app_organizations ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE app_organizations ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'PENDING';
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS capacity_text text;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS fuel_type text;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS operator_included boolean NOT NULL DEFAULT false;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS odometer_hours numeric(12,2);
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS last_service_date date;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'hi';
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS emergency_contact text;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS driving_license_number text;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS driving_license_expiry date;
ALTER TABLE worker_profiles ADD COLUMN IF NOT EXISTS voice_assistance_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'PENDING';
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES app_users(id);
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS correction_note text;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='app_users_preferred_language_check') THEN ALTER TABLE app_users ADD CONSTRAINT app_users_preferred_language_check CHECK (preferred_language IN ('hi','en')); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='app_organizations_verification_status_check') THEN ALTER TABLE app_organizations ADD CONSTRAINT app_organizations_verification_status_check CHECK (verification_status IN ('PENDING','IN_REVIEW','VERIFIED','REJECTED')); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='marketplace_listings_availability_status_check') THEN ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_availability_status_check CHECK (availability_status IN ('AVAILABLE','ON_RENT','MAINTENANCE','INACTIVE')); END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='work_logs_approval_status_check') THEN ALTER TABLE work_logs ADD CONSTRAINT work_logs_approval_status_check CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')); END IF;
END $$;
CREATE TABLE IF NOT EXISTS machine_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), machine_listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
 owner_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT, contractor_organization_id uuid REFERENCES app_organizations(id) ON DELETE RESTRICT,
 driver_user_id uuid REFERENCES app_users(id) ON DELETE RESTRICT, supervisor_user_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
 site_name text NOT NULL, site_location text NOT NULL, starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_machine_assignments_owner ON machine_assignments(owner_user_id,status,starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_machine_assignments_driver ON machine_assignments(driver_user_id,status,starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_machine_assignments_contractor ON machine_assignments(contractor_organization_id,status,starts_at DESC);
CREATE TABLE IF NOT EXISTS driver_activity_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL REFERENCES machine_assignments(id) ON DELETE RESTRICT,
 driver_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
 entry_type text NOT NULL CHECK (entry_type IN ('WORK_START','WORK_STOP','DIESEL','HOUR_METER','TRIP','BREAKDOWN','REPAIR')),
 entry_at timestamptz NOT NULL DEFAULT now(), numeric_value numeric(14,2), notes text NOT NULL DEFAULT '', photo_object_key text,
 approval_status text NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
 reviewed_by uuid REFERENCES app_users(id), reviewed_at timestamptz, review_note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_driver_entries_assignment ON driver_activity_entries(assignment_id,entry_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_entries_driver ON driver_activity_entries(driver_user_id,entry_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_entries_pending ON driver_activity_entries(approval_status,created_at DESC);
ALTER TABLE machine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_activity_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='machine_assignments' AND policyname='machine_assignment_read_scope') THEN
  CREATE POLICY machine_assignment_read_scope ON machine_assignments FOR SELECT TO siteseva_app USING (
   owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid OR driver_user_id=nullif(current_setting('app.user_id',true),'')::uuid
   OR supervisor_user_id=nullif(current_setting('app.user_id',true),'')::uuid
   OR EXISTS (SELECT 1 FROM app_org_memberships m WHERE m.organization_id=contractor_organization_id AND m.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND m.membership_status='ACTIVE')
   OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='machine_assignments' AND policyname='machine_assignment_owner_write') THEN
  CREATE POLICY machine_assignment_owner_write ON machine_assignments FOR ALL TO siteseva_app
  USING (owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN'))
  WITH CHECK (owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_activity_entries' AND policyname='driver_entry_read_scope') THEN
  CREATE POLICY driver_entry_read_scope ON driver_activity_entries FOR SELECT TO siteseva_app USING (
   driver_user_id=nullif(current_setting('app.user_id',true),'')::uuid
   OR EXISTS (SELECT 1 FROM machine_assignments a WHERE a.id=assignment_id AND (a.owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid OR a.supervisor_user_id=nullif(current_setting('app.user_id',true),'')::uuid
   OR EXISTS (SELECT 1 FROM app_org_memberships m WHERE m.organization_id=a.contractor_organization_id AND m.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND m.membership_status='ACTIVE')))
   OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_activity_entries' AND policyname='driver_entry_submit') THEN
  CREATE POLICY driver_entry_submit ON driver_activity_entries FOR INSERT TO siteseva_app WITH CHECK (
   driver_activity_entries.driver_user_id=nullif(current_setting('app.user_id',true),'')::uuid
   AND EXISTS (SELECT 1 FROM machine_assignments a WHERE a.id=driver_activity_entries.assignment_id AND a.driver_user_id=driver_activity_entries.driver_user_id AND a.status='ACTIVE'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_activity_entries' AND policyname='driver_entry_review') THEN
  CREATE POLICY driver_entry_review ON driver_activity_entries FOR UPDATE TO siteseva_app
  USING (EXISTS (SELECT 1 FROM machine_assignments a WHERE a.id=assignment_id AND (a.owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid OR a.supervisor_user_id=nullif(current_setting('app.user_id',true),'')::uuid))
   OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM machine_assignments a WHERE a.id=assignment_id AND (a.owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid OR a.supervisor_user_id=nullif(current_setting('app.user_id',true),'')::uuid))
   OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN'));
 END IF;
END $$;
GRANT SELECT,INSERT,UPDATE ON machine_assignments,driver_activity_entries TO siteseva_app;
GRANT SELECT,UPDATE ON app_organizations,app_users,marketplace_listings,worker_profiles,work_logs TO siteseva_app;
