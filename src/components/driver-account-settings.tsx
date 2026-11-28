"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type AccountData = {
  account: { display_name: string; email: string | null; mobile_e164: string; preferred_language: string; created_at: string } | null;
  profile: { full_name: string; phone: string; experience_years: number | null; skills: string[]; service_area: string | null; verification_status: string; emergency_contact: string | null; driving_license_number: string | null; driving_license_expiry: string | null; preferred_language: string; voice_assistance_enabled: boolean } | null;
};

export function DriverAccountSettings() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "जानकारी नहीं मिली"); setData(d); })
      .catch((e) => setError(e instanceof Error ? e.message : "जानकारी नहीं मिली"))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(""); setMessage("");
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("newPassword") || "");
    const confirmPassword = String(f.get("confirmPassword") || "");
    if (newPassword && newPassword !== confirmPassword) { setError("नया पासवर्ड और पुष्टि वाला पासवर्ड एक जैसा नहीं है।"); setSaving(false); return; }
    const payload = {
      fullName: f.get("fullName"), phone: f.get("phone"), email: f.get("email"),
      experienceYears: f.get("experienceYears"), skills: String(f.get("skills") || "").split(",").map(s => s.trim()).filter(Boolean),
      serviceArea: f.get("serviceArea"), emergencyContact: f.get("emergencyContact"),
      licenseNumber: f.get("licenseNumber"), licenseExpiry: f.get("licenseExpiry"),
      language: f.get("language"), oldPassword: f.get("oldPassword"), newPassword,
    };
    try {
      const r = await fetch("/api/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "सेव नहीं हुआ");
      setMessage(d.message || "सेव हो गया।");
      e.currentTarget.reset();
      const fresh = await fetch("/api/account", { cache: "no-store" });
      if (fresh.ok) setData(await fresh.json());
    } catch (e) { setError(e instanceof Error ? e.message : "सेव नहीं हुआ"); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="dashboard-shell"><section className="panel">My Account लोड हो रहा है…</section></main>;
  if (!data) return <main className="dashboard-shell"><section className="panel"><p className="error">{error || "अकाउंट नहीं मिला।"}</p><Link href="/driver">Driver Dashboard पर वापस जाएँ</Link></section></main>;
  const p = data.profile;
  return <main className="dashboard-shell">
    <div className="core-dashboard">
      <header className="dashboard-header"><div><div className="eyebrow">SITE SEVA · DRIVER ACCOUNT</div><h1>My Account</h1><p>अपनी व्यक्तिगत जानकारी और अकाउंट सेटिंग्स यहाँ संभालें।</p></div><Link className="secondary" href="/driver">← Driver Dashboard</Link></header>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}
      <section className="panel driver-panel">
        <div className="section-heading"><div><div className="eyebrow">ACCOUNT DETAILS</div><h2>अकाउंट की जानकारी</h2></div><span className="driver-approval">{p?.verification_status || "प्रोफाइल नहीं बनी"}</span></div>
        <div className="driver-profile-details">
          <p><strong>लॉगिन मोबाइल:</strong> {data.account?.mobile_e164 || "—"}</p>
          <p><strong>अकाउंट बनाया:</strong> {data.account?.created_at ? new Date(data.account.created_at).toLocaleDateString("hi-IN") : "—"}</p>
          <p><strong>अकाउंट प्रकार:</strong> Driver</p>
        </div>
      </section>
      <form className="panel login-form driver-entry-form" onSubmit={save}>
        <div className="eyebrow">PERSONAL INFORMATION</div><h2>प्रोफाइल और सेटिंग्स</h2>
        <label>पूरा नाम</label><input name="fullName" required defaultValue={p?.full_name || data.account?.display_name || ""} maxLength={120}/>
        <label>मोबाइल नंबर</label><input name="phone" required defaultValue={p?.phone || data.account?.mobile_e164 || ""} maxLength={20}/>
        <label>ईमेल</label><input name="email" type="email" defaultValue={data.account?.email || ""} placeholder="आपका ईमेल (यदि हो)"/>
        <label>अनुभव (वर्ष)</label><input name="experienceYears" type="number" min="0" max="80" step="0.5" defaultValue={p?.experience_years ?? ""} placeholder="जैसे 5"/>
        <label>आपके कौशल (कॉमा लगाकर लिखें)</label><input name="skills" defaultValue={p?.skills?.join(", ") || ""} placeholder="JCB, Excavator, Truck Driving"/>
        <label>काम का क्षेत्र / शहर</label><input name="serviceArea" defaultValue={p?.service_area || ""} placeholder="जैसे पटना, बिहार"/>
        <label>इमरजेंसी संपर्क नंबर</label><input name="emergencyContact" defaultValue={p?.emergency_contact || ""} maxLength={30}/>
        <label>ड्राइविंग लाइसेंस नंबर</label><input name="licenseNumber" defaultValue={p?.driving_license_number || ""} maxLength={40}/>
        <label>लाइसेंस समाप्ति तारीख</label><input name="licenseExpiry" type="date" defaultValue={p?.driving_license_expiry ? String(p.driving_license_expiry).slice(0,10) : ""}/>
        <label>भाषा</label><select name="language" defaultValue={p?.preferred_language || data.account?.preferred_language || "hi"}><option value="hi">हिन्दी</option><option value="en">English</option></select>
        <div className="divider"></div>
        <div className="eyebrow">SECURITY</div><h2>पासवर्ड बदलें</h2>
        <p>पासवर्ड बदलना हो तभी पुराना और नया पासवर्ड भरें। खाली छोड़ने पर पासवर्ड नहीं बदलेगा।</p>
        <label>पुराना पासवर्ड</label><input name="oldPassword" type="password" autoComplete="current-password" placeholder="पुराना पासवर्ड"/>
        <label>नया पासवर्ड (कम-से-कम 8 अक्षर)</label><input name="newPassword" type="password" autoComplete="new-password" minLength={8} placeholder="नया पासवर्ड"/>
        <label>नया पासवर्ड दोबारा लिखें</label><input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} placeholder="नया पासवर्ड फिर से लिखें"/>
        <button type="submit" disabled={saving}>{saving ? "सेव हो रहा है…" : "जानकारी सेव करें"}</button>
      </form>
      <section className="panel driver-panel"><h2>सुरक्षा</h2><p>अपना पासवर्ड किसी के साथ साझा न करें। काम खत्म होने पर लॉगआउट करें।</p><form action="/api/auth/logout" method="post"><button type="submit" className="secondary">लॉगआउट</button></form></section>
    </div>
  </main>;
}
