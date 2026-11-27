"use client";

import { FormEvent, useState } from "react";

type Props = { initialMobile: string };
type Pending = { pendingId: string; secret: string; otpauthUri: string; expiresInMinutes: number };

export function AdminBootstrapForm({ initialMobile }: Props) {
  const [token, setToken] = useState("");
  const [mobile, setMobile] = useState(initialMobile);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/super-admin/bootstrap/start", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ bootstrapToken: token, mobile, displayName, password }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "सेटअप शुरू नहीं हुआ।"); return; }
      setPending(data);
      setToken(""); setPassword("");
    } catch { setError("नेटवर्क समस्या है।"); }
    finally { setBusy(false); }
  }
  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!pending) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/super-admin/bootstrap/complete", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ pendingId: pending.pendingId, code }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "सत्यापन असफल रहा।"); return; }
      window.location.assign(data.redirectTo);
    } catch { setError("नेटवर्क समस्या है।"); }
    finally { setBusy(false); }
  }
  return (
    <main>
      <section className="panel login-panel">
        <div className="eyebrow">SiteSeva · एक बार का सुरक्षित सेटअप</div>
        <h1>Company Super Admin बनाएँ</h1>
        <p>यह पहला अकाउंट केवल एक बार बनाया जा सकता है। मजबूत पासवर्ड और Authenticator ऐप जरूरी है।</p>
        {!pending ? (
          <form onSubmit={start} className="login-form">
            <label htmlFor="bootstrap-token">एक बार का सेटअप टोकन</label>
            <input id="bootstrap-token" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} minLength={32} required />
            <label htmlFor="admin-name">पूरा नाम</label>
            <input id="admin-name" value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={120} required />
            <label htmlFor="admin-mobile">मोबाइल नंबर</label>
            <input id="admin-mobile" type="tel" value={mobile} onChange={e=>setMobile(e.target.value)} required />
            <label htmlFor="admin-password">नया मजबूत पासवर्ड (कम-से-कम 12 अक्षर)</label>
            <input id="admin-password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} maxLength={128} required />
            <button type="submit" disabled={busy}>{busy ? "सेटअप शुरू हो रहा है…" : "Authenticator सेटअप शुरू करें"}</button>
          </form>
        ) : (
          <form onSubmit={complete} className="login-form">
            <p><strong>Authenticator ऐप खोलें</strong> (Google Authenticator, Microsoft Authenticator या 2FAS) और नया अकाउंट जोड़ें।</p>
            <label>खाता नाम</label><p>SiteSeva · {mobile}</p>
            <label>Secret Key (इसे निजी रखें)</label>
            <input readOnly value={pending.secret} onFocus={e=>e.currentTarget.select()} />
            <p className="small-note">अगर ऐप में QR विकल्प हो तो otpauth URI इस्तेमाल कर सकते हैं: {pending.otpauthUri}</p>
            <p className="small-note">यह Secret Key केवल इसी सेटअप के दौरान दिखेगी। सुरक्षित जगह बैकअप रखें।</p>
            <label htmlFor="totp-code">Authenticator का 6 अंकों का कोड</label>
            <input id="totp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} required />
            <button type="submit" disabled={busy || code.length!==6}>{busy ? "सत्यापन हो रहा है…" : "सत्यापित करके Admin बनाएँ"}</button>
          </form>
        )}
        {error ? <p className="error" role="alert">{error}</p> : null}
        <p className="small-note">पासवर्ड और Authenticator कोड किसी के साथ साझा न करें। सेटअप पूरा होने पर यह पेज बंद हो जाएगा।</p>
      </section>
    </main>
  );
}
