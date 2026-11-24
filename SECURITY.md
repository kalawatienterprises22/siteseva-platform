# SiteSeva Security Baseline

## Implemented foundation

- Separate application repository, Vercel project, Neon project and database.
- Runtime database identity is a restricted `siteseva_app` role; the database-owner URL is limited to the Vercel Development environment for controlled migrations.
- Parameterized PostgreSQL queries and a server-only database module.
- Password verification with bcrypt.
- Opaque random session tokens; only SHA-256 token hashes are stored in PostgreSQL.
- HttpOnly, SameSite=Lax session cookies; Secure and __Host- prefixed in production.
- Server-side session validation and explicit session revocation on logout.
- Common login and Company Super Admin login use different routes and enforce different role rules.
- Super Admin session creation is blocked until MFA is enabled.
- Login attempt throttling and temporary account lockout.
- PostgreSQL row-level security on users, roles, memberships, sessions and audit history.
- Append-only audit history trigger.
- Nonce-based Content Security Policy and baseline browser security headers.
- No real user account is seeded into the database.

## Important remaining work before production

- Complete MFA enrollment, verification and recovery for Super Admin.
- Create the first Super Admin using a one-time, expiring bootstrap process.
- Add server-side permission checks to every business API and record-level tenant checks.
- Add CSRF protections to every state-changing browser endpoint and test them.
- Add automated tests for role escalation, tenant isolation, session revocation, brute force, and IDOR.
- Configure independent off-site database and uploaded-file backups, then perform restore drills.
- Complete dependency, static analysis, and deployment security review.

Do not onboard real users or store live business data until the remaining work is completed and the production build is verified.
