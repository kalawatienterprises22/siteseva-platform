# SITE SEVA — Master API Integration Register

External integrations are intentionally deferred. The core dashboards use the existing Neon/PostgreSQL backend and do not call external providers.

| Module | API / Provider category | Purpose | Status / integration gate |
|---|---|---|---|
| Authentication | SMS OTP provider | Mobile OTP delivery and verification | Later, choose provider and integrate in one batch |
| Dealer / business verification | Authorised GSTIN verification API / GSP | GST status and legal-name verification | Later; manual document review remains available |
| File and photo storage | Secure object storage (S3-compatible or Vercel Blob) | Machine photos, licences, receipts, documents, dispatch proof | Later |
| Maps and delivery location | Maps geocoding API | PIN-code, address and public landmark lookup | Later |
| Maps and delivery location | Routing / distance matrix API | Road distance and ETA, distinct from straight-line distance | Later |
| Smart Parts Finder | Vision-capable AI API | Image understanding and candidate part matching | Later |
| Smart Parts Finder | OCR API / model | Read stamped part numbers and labels | Later |
| Smart Parts Finder | Image embeddings / vector search | Similar-part visual search | Later; requires an authorised catalogue |
| Payments | Marketplace payment gateway | KYC, payment collection, split settlement, refund and reconciliation | Later; provider and legal flow to be selected |
| Notifications | WhatsApp Business Platform | Dealer, contractor, supervisor and order alerts | Later; templates and opt-in required |
| Notifications | Push notification provider (e.g. FCM) | Mobile/web push alerts | Later |
| Tender Intelligence | Official tender portal feeds / permitted APIs | Tender notices, results and documents | Later; portal terms and licences must be checked individually |
| Smart Fleet | GPS tracker / telematics vendor API | Live machine coordinates, ignition and device status | Later; hardware protocol/vendor to be confirmed |
| Smart Fleet | Fuel sensor / CAN telematics API | Calibrated fuel and engine-hour readings | Later; compatible hardware and installation required |
| Driver assistance | Text-to-speech / speech API | Hindi and regional voice instructions | Later |
| Offline Driver App | No external provider by default | Local offline queue and sync when online | Build with app storage; API not required |

## Integration rule
1. Complete the core dashboard and schema foundation first.
2. Confirm the chosen providers, API plans, credentials, permissions and pricing.
3. Integrate the approved APIs together in one controlled integration phase.
4. Run provider sandbox tests and end-to-end tests only after integrations are configured.
5. Never infer machine compatibility, payment verification, GST validity, road distance or live fuel level when the relevant provider/device data is unavailable.
