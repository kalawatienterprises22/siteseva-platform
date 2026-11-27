-- Ensure Super Admin authorization is resolved from the verified role assignment,
-- not a connection-local flag that API handlers may not set.
ALTER POLICY listing_update_guard ON marketplace_listings
USING (owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid OR EXISTS (
  SELECT 1 FROM app_user_roles ur
  JOIN app_roles r ON r.id = ur.role_id
  WHERE ur.user_id = nullif(current_setting('app.user_id', true),'')::uuid
    AND r.role_key = 'SUPER_ADMIN'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM app_user_roles ur
  JOIN app_roles r ON r.id = ur.role_id
  WHERE ur.user_id = nullif(current_setting('app.user_id', true),'')::uuid
    AND r.role_key = 'SUPER_ADMIN'
) OR (
  owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
  AND EXISTS (SELECT 1 FROM app_org_memberships m
    WHERE m.organization_id = marketplace_listings.organization_id
      AND m.user_id = nullif(current_setting('app.user_id', true),'')::uuid
      AND m.membership_status = 'ACTIVE')
));
ALTER POLICY tender_update_guard ON tenders
USING (created_by = nullif(current_setting('app.user_id', true),'')::uuid OR EXISTS (
  SELECT 1 FROM app_user_roles ur
  JOIN app_roles r ON r.id = ur.role_id
  WHERE ur.user_id = nullif(current_setting('app.user_id', true),'')::uuid
    AND r.role_key = 'SUPER_ADMIN'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM app_user_roles ur
  JOIN app_roles r ON r.id = ur.role_id
  WHERE ur.user_id = nullif(current_setting('app.user_id', true),'')::uuid
    AND r.role_key = 'SUPER_ADMIN'
) OR (
  created_by = nullif(current_setting('app.user_id', true),'')::uuid
  AND EXISTS (SELECT 1 FROM app_org_memberships m
    WHERE m.organization_id = tenders.organization_id
      AND m.user_id = nullif(current_setting('app.user_id', true),'')::uuid
      AND m.membership_status = 'ACTIVE')
));
ALTER POLICY listing_photo_read ON marketplace_listing_photos
USING (EXISTS (SELECT 1 FROM marketplace_listings l
  WHERE l.id = marketplace_listing_photos.listing_id
    AND (l.status='APPROVED'
      OR l.owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
      OR EXISTS (
  SELECT 1 FROM app_user_roles ur
  JOIN app_roles r ON r.id = ur.role_id
  WHERE ur.user_id = nullif(current_setting('app.user_id', true),'')::uuid
    AND r.role_key = 'SUPER_ADMIN'
))));
ALTER POLICY listing_photo_delete ON marketplace_listing_photos
USING (EXISTS (SELECT 1 FROM marketplace_listings l
  WHERE l.id = marketplace_listing_photos.listing_id
    AND (l.owner_user_id = nullif(current_setting('app.user_id', true),'')::uuid
      OR EXISTS (
  SELECT 1 FROM app_user_roles ur
  JOIN app_roles r ON r.id = ur.role_id
  WHERE ur.user_id = nullif(current_setting('app.user_id', true),'')::uuid
    AND r.role_key = 'SUPER_ADMIN'
))));
