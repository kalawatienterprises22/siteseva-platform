# SiteSeva Platform

An independent construction marketplace and site-operations platform.

## Isolated resources

- GitHub repository: `kalawatienterprises22/siteseva-platform`
- Vercel project: `siteseva-platform` (`prj_CbDcfQQfb7uvmQGUg1uc3jSjIERO`)
- Neon project: `icy-term-73456502`
- Neon production branch: `br-gentle-tree-big8tydn`
- Database: `siteseva_db`
- Runtime role: `siteseva_app` (restricted; no role/database administration)

This project must not share code, data, credentials, authentication, or deployment settings with SuperPay/Paykassma or ParixBet. The previous SiteSeva backup must remain untouched until a deliberate cutover.

## Current implementation status

Implemented foundation:
- First Company Super Admin provisioned and verified.
- Separate user and Super Admin login routes.
- Mandatory TOTP MFA for Super Admin login.
- Revocable server-side sessions and logout.
- Login throttling, role checks, audit log, and PostgreSQL row-level security.
- Public marketplace read APIs and authenticated write APIs for listings, tenders, quotations, worker profiles, and work logs.
- Super Admin moderation queue and basic operational totals.
- Hindi/English login selection and partial Super Admin dashboard localization.

Not yet a complete production marketplace:
- Public registration and approval/onboarding flows are not implemented.
- Role-specific Contractor, Machine Owner, Driver, Operator, Supervisor, and Public User dashboards are not implemented.
- GST verification and organization/member administration are incomplete.
- Listing photo upload/storage is not implemented.
- WhatsApp notifications are not implemented.
- Full operational reports and exports are not implemented.
- Automated tenant-isolation, authorization, CSRF, recovery, and production security tests remain.
- The privacy policy still needs the operator's registered legal name, postal address, and monitored privacy contact.

## Launch policy

The current `launch-foundation` branch is a preview foundation, not a complete production release. Do not promote it as a full public marketplace or onboard real users until the remaining launch blockers are completed and verified. A limited public information-site launch may be considered separately, with registration and unfinished workflows clearly unavailable.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set independent SiteSeva environment values.
3. Run `npm install`, then `npm run dev`.

Never commit real secrets. Production secrets belong only in the SiteSeva Vercel project's encrypted environment variables.
