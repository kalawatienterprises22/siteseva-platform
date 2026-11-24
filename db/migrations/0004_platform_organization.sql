-- Create the company-level tenant container. No user or personal data is seeded.
INSERT INTO app_organizations (name, organization_type, status)
SELECT 'SiteSeva Platform', 'COMPANY', 'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM app_organizations
  WHERE name = 'SiteSeva Platform' AND organization_type = 'COMPANY'
);
