# SiteSeva Platform

A new, independent construction operations and marketplace platform.

## Isolation commitments

- Dedicated GitHub repository: `kalawatienterprises22/siteseva-platform`
- Dedicated Vercel project: `siteseva-platform`
- Dedicated Neon project/database: `siteseva-platform` / `siteseva_db`
- No shared authentication, database, API credentials, or environment secrets with other projects.

## Security-first build order

1. Server-side authentication and revocable sessions.
2. Separate Super Admin route and mandatory MFA.
3. Server-enforced role and record-level authorization.
4. Audit history for privileged actions.
5. Input validation, rate limits, secure headers, and abuse controls.
6. Backups, recovery drills, and production security testing.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set the independent SiteSeva database URL and secrets locally.
3. Run `npm install`, then `npm run dev`.

Never commit real secrets. Production secrets belong only in the SiteSeva Vercel project's encrypted environment variables.

## Important

This is the initial application foundation, not a production-ready authentication system. Do not onboard real users or store business data until authentication, authorization, backups, and security tests are complete.
