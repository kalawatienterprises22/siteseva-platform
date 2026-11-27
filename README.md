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
- Public registration request intake and manual Super Admin approval are implemented; Contractor and Labour Contractor requests require GSTIN format validation.
- Basic role workspaces support machinery listing, tender submission, site work-log entry, and public marketplace browsing according to account role.
- SMS OTP and automated GST portal verification are not connected; mobile and GST documents require manual checking before approval.
- Full organization/member administration and dedicated role-specific panels remain incomplete.
- Listing photo upload/storage is not implemented.
- WhatsApp notifications are not implemented.
- Full operational reports, exports, and breakdown analytics are not implemented.
- Automated tenant-isolation, authorization, CSRF, recovery, and production security tests remain.
- The privacy policy still needs the operator's registered legal name, postal address, and monitored privacy contact.

## Launch policy

The current `launch-foundation` branch is a tested preview foundation, not a complete production release. Do not promote it as a complete public marketplace or onboard real users until legal contact details, manual verification procedures, role workflows, backups, and security tests are completed. Registration requests must remain subject to manual Super Admin review.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set independent SiteSeva environment values.
3. Run `npm install`, then `npm run dev`.

Never commit real secrets. Production secrets belong only in the SiteSeva Vercel project's encrypted environment variables.
