-- SiteSeva marketplace foundation (additive migration)
-- Applied to Neon project siteseva-platform / siteseva_db.
CREATE TABLE IF NOT EXISTS marketplace_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES app_organizations(id),
 owner_user_id uuid NOT NULL REFERENCES app_users(id),
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 160),
 description text NOT NULL DEFAULT '',
 category text NOT NULL CHECK (category IN ('EXCAVATOR','JCB','CRANE','DUMPER','TRUCK','TRACTOR','OTHER')),
 make text, model text, year integer CHECK (year IS NULL OR year BETWEEN 1950 AND 2100),
 hourly_rate numeric(12,2) CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
 daily_rate numeric(12,2) CHECK (daily_rate IS NULL OR daily_rate >= 0),
 location_text text NOT NULL, contact_phone text,
 status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT','PENDING','APPROVED','REJECTED','PAUSED','ARCHIVED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_listing_photos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 listing_id uuid NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
 object_key text NOT NULL, sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(listing_id, object_key)
);
CREATE TABLE IF NOT EXISTS tenders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES app_organizations(id),
 created_by uuid NOT NULL REFERENCES app_users(id),
 title text NOT NULL CHECK (length(trim(title)) BETWEEN 5 AND 200),
 description text NOT NULL, category text NOT NULL, location_text text NOT NULL,
 budget_min numeric(14,2) CHECK (budget_min IS NULL OR budget_min >= 0),
 budget_max numeric(14,2) CHECK (budget_max IS NULL OR budget_max >= 0),
 deadline timestamptz,
 status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT','PENDING','PUBLISHED','CLOSED','CANCELLED','REJECTED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min)
);
CREATE TABLE IF NOT EXISTS quotations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES app_organizations(id),
 submitted_by uuid NOT NULL REFERENCES app_users(id),
 amount numeric(14,2) NOT NULL CHECK (amount >= 0), message text NOT NULL DEFAULT '',
 validity_until timestamptz,
 status text NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tender_id, submitted_by)
);
CREATE TABLE IF NOT EXISTS worker_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
 organization_id uuid REFERENCES app_organizations(id),
 worker_type text NOT NULL CHECK (worker_type IN ('CONTRACTOR','OPERATOR','DRIVER','SUPERVISOR','VEHICLE_OWNER')),
 full_name text NOT NULL, phone text NOT NULL,
 experience_years numeric(4,1) CHECK (experience_years IS NULL OR experience_years BETWEEN 0 AND 80),
 skills text[] NOT NULL DEFAULT '{}', service_area text,
 verification_status text NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS work_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES app_organizations(id),
 equipment_listing_id uuid REFERENCES marketplace_listings(id),
 recorded_by uuid NOT NULL REFERENCES app_users(id),
 work_date date NOT NULL, start_time timestamptz, end_time timestamptz,
 running_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (running_hours >= 0),
 diesel_litres numeric(10,2) NOT NULL DEFAULT 0 CHECK (diesel_litres >= 0),
 breakdown_hours numeric(8,2) NOT NULL DEFAULT 0 CHECK (breakdown_hours >= 0),
 notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_public ON marketplace_listings(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenders_public ON tenders(status, deadline);
CREATE INDEX IF NOT EXISTS idx_quotations_tender ON quotations(tender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_type ON worker_profiles(worker_type, verification_status);
CREATE INDEX IF NOT EXISTS idx_work_logs_org_date ON work_logs(organization_id, work_date DESC);

GRANT USAGE ON SCHEMA public TO siteseva_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON marketplace_listings, marketplace_listing_photos, tenders, quotations, worker_profiles, work_logs TO siteseva_app;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_read ON marketplace_listings FOR SELECT TO siteseva_app USING (
 status='APPROVED' OR owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY listing_insert ON marketplace_listings FOR INSERT TO siteseva_app WITH CHECK (
 owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid
 AND EXISTS (SELECT 1 FROM app_org_memberships m WHERE m.organization_id=marketplace_listings.organization_id AND m.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND m.membership_status='ACTIVE')
);
CREATE POLICY listing_update ON marketplace_listings FOR UPDATE TO siteseva_app USING (
 owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY listing_delete ON marketplace_listings FOR DELETE TO siteseva_app USING (
 owner_user_id=nullif(current_setting('app.user_id',true),'')::uuid
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY tender_read ON tenders FOR SELECT TO siteseva_app USING (
 status='PUBLISHED' OR created_by=nullif(current_setting('app.user_id',true),'')::uuid
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY tender_insert ON tenders FOR INSERT TO siteseva_app WITH CHECK (
 created_by=nullif(current_setting('app.user_id',true),'')::uuid
 AND EXISTS (SELECT 1 FROM app_org_memberships m WHERE m.organization_id=tenders.organization_id AND m.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND m.membership_status='ACTIVE')
);
CREATE POLICY tender_update ON tenders FOR UPDATE TO siteseva_app USING (
 created_by=nullif(current_setting('app.user_id',true),'')::uuid
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY quotation_read ON quotations FOR SELECT TO siteseva_app USING (
 submitted_by=nullif(current_setting('app.user_id',true),'')::uuid
 OR EXISTS (SELECT 1 FROM tenders t WHERE t.id=quotations.tender_id AND t.created_by=nullif(current_setting('app.user_id',true),'')::uuid)
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY quotation_insert ON quotations FOR INSERT TO siteseva_app WITH CHECK (
 submitted_by=nullif(current_setting('app.user_id',true),'')::uuid
 AND EXISTS (SELECT 1 FROM app_org_memberships m WHERE m.organization_id=quotations.organization_id AND m.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND m.membership_status='ACTIVE')
);
CREATE POLICY worker_read ON worker_profiles FOR SELECT TO siteseva_app USING (
 user_id=nullif(current_setting('app.user_id',true),'')::uuid OR verification_status='VERIFIED'
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY worker_insert ON worker_profiles FOR INSERT TO siteseva_app WITH CHECK (user_id=nullif(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY worker_update ON worker_profiles FOR UPDATE TO siteseva_app USING (
 user_id=nullif(current_setting('app.user_id',true),'')::uuid
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY worklog_read ON work_logs FOR SELECT TO siteseva_app USING (
 EXISTS (SELECT 1 FROM app_org_memberships m WHERE m.organization_id=work_logs.organization_id AND m.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND m.membership_status='ACTIVE')
 OR EXISTS (SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id WHERE ur.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND r.role_key='SUPER_ADMIN')
);
CREATE POLICY worklog_insert ON work_logs FOR INSERT TO siteseva_app WITH CHECK (
 recorded_by=nullif(current_setting('app.user_id',true),'')::uuid
 AND EXISTS (SELECT 1 FROM app_org_memberships m WHERE m.organization_id=work_logs.organization_id AND m.user_id=nullif(current_setting('app.user_id',true),'')::uuid AND m.membership_status='ACTIVE')
);
