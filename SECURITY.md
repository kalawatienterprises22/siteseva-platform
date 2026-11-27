# SiteSeva Security Status

## Implemented and verified foundation

- Separate SiteSeva repository, Vercel project, Neon project, database, and runtime credentials.
- Runtime database identity is the restricted `siteseva_app` role; the owner role is not configured for production runtime.
- Parameterized PostgreSQL queries and a server-only database module.
- Password hashing with bcrypt.
- Opaque random session tokens; only SHA-256 token hashes are stored.
- HttpOnly, SameSite=Lax session cookies; Secure and __Host-prefixed in production.
- Server-side session validation and explicit revocation on logout.
- Separate common-user and Company Super Admin login routes.
- TOTP MFA is required for Super Admin login.
- Login attempt throttling and temporary account lockout.
- PostgreSQL row-level security on identity, membership, session, audit, and marketplace tables.
- Append-only audit history trigger.
- Nonce-based Content Security Policy and baseline browser security headers.
- First Company Super Admin bootstrap completed; repeat setup page now redirects to the Super Admin login page.

## Production launch blockers

- Public user registration, verification, and approval workflow.
- Server-side organization creation and membership management, including GST verification for contractors.
- Complete role-specific dashboards and end-to-end workflow tests for Contractor, Machine Owner, Driver, Operator, Supervisor, and Public User.
- Record-level tenant-isolation tests for every business API, including cross-organization IDOR attempts.
- Consistent CSRF/origin validation on every state-changing endpoint.
- Automated tests for role escalation, session revocation, brute force, input validation, and moderation authorization.
- Independent off-site database backups and a successful restore drill; uploaded-file backup once file storage is enabled.
- Dependency audit, lint, typecheck, production build, and deployment security review.
- Complete and accurate privacy/legal operator details and a monitored privacy contact before public user data collection.

## Operational rules

- Never expose database URLs, passwords, MFA seeds, bootstrap tokens, or session secrets in client code or logs.
- Never use the database-owner role for production application traffic.
- Keep preview and production secrets separate.
- Do not onboard real users or store live business data until the launch blockers above are completed and verified.
