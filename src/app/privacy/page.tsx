import Link from "next/link";

export const metadata = { title: "Privacy Policy | SiteSeva", robots: { index: false, follow: false } };

export default function PrivacyPage() {
  return (
    <main className="legal">
      <div className="eyebrow">SiteSeva · Legal</div>
      <h1>Privacy Policy</h1>
      <p>Last updated: 28 November 2026</p>
      <p>This page describes how SiteSeva intends to handle information when people use its construction marketplace and operations services. Before public onboarding, the SiteSeva operator must publish its registered legal name, postal address and a monitored privacy contact on this page.</p>
      <h2>Information we may collect</h2>
      <p>Account details such as mobile number, name and authentication records; contractor, vehicle-owner, operator and driver profile details; machinery listings, tender and quotation information; uploaded photographs and documents; and site-operation records such as running hours, diesel consumption and breakdown hours.</p>
      <h2>How information is used</h2>
      <p>To provide accounts, marketplace listings, tender and quotation workflows, role-based dashboards, verification, customer support, platform security and audit records.</p>
      <h2>Sharing</h2>
      <p>Information may be shown to other users when required for a listing, tender or quotation workflow. We do not intend to sell personal information. Service providers may process information only to operate the platform, subject to appropriate safeguards.</p>
      <h2>Security and retention</h2>
      <p>SiteSeva uses server-side authentication, access controls and security logging. No internet service can guarantee absolute security. Records should be retained only for legitimate operational, legal and security needs and deleted or anonymized when no longer required.</p>
      <h2>Your choices and requests</h2>
      <p>Users should be able to request access, correction or deletion of personal information, subject to legal and operational retention requirements. A monitored privacy contact must be added by the SiteSeva operator before this policy is treated as final.</p>
      <h2>Children</h2>
      <p>SiteSeva is intended for business and work-related use, not for children.</p>
      <h2>Policy changes</h2>
      <p>This policy may be updated as platform features and legal requirements change.</p>
      <p><strong>Operator publication checklist:</strong> add the registered entity name, complete postal address, privacy email/phone, data protection contact and any third-party service providers actually enabled before production user registration or app-store submission.</p>
      <p><Link href="/">← Back to SiteSeva</Link></p>
    </main>
  );
}
