-- SiteSeva marketplace RLS hardening (additive and data-preserving).
-- Restrictive policies tighten existing permissive policies without replacing them.
CREATE POLICY listing_update_guard ON marketplace_listings AS RESTRICTIVE FOR UPDATE TO siteseva_app
USING (
  owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
  OR current_setting('app.is_super_admin', true) = 'true'
)
WITH CHECK (
  current_setting('app.is_super_admin', true) = 'true'
  OR (
    owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
    AND EXISTS (
      SELECT 1 FROM app_org_memberships m
      WHERE m.organization_id = marketplace_listings.organization_id
        AND m.user_id = nullif(current_setting('app.user_id', true),'')::uuid
        AND m.membership_status = 'ACTIVE'
    )
  )
);
CREATE POLICY tender_update_guard ON tenders AS RESTRICTIVE FOR UPDATE TO siteseva_app
USING (
  created_by = nullif(current_setting('app.user_id', true),'')::uuid
  OR current_setting('app.is_super_admin', true) = 'true'
)
WITH CHECK (
  current_setting('app.is_super_admin', true) = 'true'
  OR (
    created_by = nullif(current_setting('app.user_id', true),'')::uuid
    AND EXISTS (
      SELECT 1 FROM app_org_memberships m
      WHERE m.organization_id = tenders.organization_id
        AND m.user_id = nullif(current_setting('app.user_id', true),'')::uuid
        AND m.membership_status = 'ACTIVE'
    )
  )
);
CREATE POLICY quotation_insert_guard ON quotations AS RESTRICTIVE FOR INSERT TO siteseva_app
WITH CHECK (
  submitted_by = nullif(current_setting('app.user_id', true),'')::uuid
  AND EXISTS (
    SELECT 1 FROM app_org_memberships m
    WHERE m.organization_id = quotations.organization_id
      AND m.user_id = nullif(current_setting('app.user_id', true),'')::uuid
      AND m.membership_status = 'ACTIVE'
  )
  AND EXISTS (
    SELECT 1 FROM tenders t
    WHERE t.id = quotations.tender_id
      AND t.status = 'PUBLISHED'
      AND t.created_by <> quotations.submitted_by
  )
);
CREATE POLICY listing_photo_read ON marketplace_listing_photos FOR SELECT TO siteseva_app
USING (
  EXISTS (
    SELECT 1 FROM marketplace_listings l
    WHERE l.id = marketplace_listing_photos.listing_id
      AND (
        l.status = 'APPROVED'
        OR l.owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
        OR current_setting('app.is_super_admin', true) = 'true'
      )
  )
);
CREATE POLICY listing_photo_insert ON marketplace_listing_photos FOR INSERT TO siteseva_app
WITH CHECK (
  EXISTS (
    SELECT 1 FROM marketplace_listings l
    JOIN app_org_memberships m ON m.organization_id = l.organization_id
    WHERE l.id = marketplace_listing_photos.listing_id
      AND l.owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
      AND m.user_id = nullif(current_setting('app.user_id', true),'')::uuid
      AND m.membership_status = 'ACTIVE'
  )
);
CREATE POLICY listing_photo_delete ON marketplace_listing_photos FOR DELETE TO siteseva_app
USING (
  EXISTS (
    SELECT 1 FROM marketplace_listings l
    WHERE l.id = marketplace_listing_photos.listing_id
      AND (
        l.owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
        OR current_setting('app.is_super_admin', true) = 'true'
      )
  )
);