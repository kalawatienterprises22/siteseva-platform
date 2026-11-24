-- Super Admin is the only role seeded with the complete permission catalogue.
INSERT INTO app_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM app_roles r
CROSS JOIN app_permissions p
WHERE r.role_key = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
