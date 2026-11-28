# SITE SEVA — Core Dashboards Foundation

Scope for the first release: Machine Listing, Owner Dashboard, Contractor Dashboard, Driver Dashboard and Super Admin Dashboard.

- Preserve existing authentication, MFA, sessions, registration approval, marketplace listings, tenders, quotations, work logs and RLS.
- Machine listing remains based on existing `marketplace_listings`; additional fields are additive.
- Owner and Contractor views use existing organisation memberships and listings/tenders.
- Driver activity is stored separately in `driver_activity_entries`, linked to a machine assignment.
- `machine_assignments` records owner, contractor organisation, assigned driver/supervisor, site, dates and status.
- Driver entries are pending supervisor/owner review; approved records retain reviewer and timestamp.
- No GPS, fuel sensor, payment, WhatsApp, SMS, maps, AI, OCR or tender-provider APIs are activated in this phase.
- Photo object keys are reserved in schema; actual upload integration waits for the approved storage provider.
- Future changes must be additive and modular. Do not replace working routes or alter existing authentication flows.
