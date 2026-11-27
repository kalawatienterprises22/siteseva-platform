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
  const [copyStatus, setCopyStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function copySecret() {
    if (!pending) return;
    try {
      await navigator.clipboard.writeText(pending.secret);
      setCopyStatus("Secret Key कॉपी हो गई। इसे केवल Authenticator के Secret key बॉक्स में Paste करें।");
    } catch {
      setCopyStatus("Key को नीचे दबाकर Select All करें और Copy चुनें।");
    }
  }

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/super-admin/bootstrap/start", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ bootstrapToken: token.trim(), mobile, displayName, password }),
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
      if (!response.ok) {
        setError([data.error || "सत्यापन असफल रहा।", data.reference || null].filter(Boolean).join(" "));
        return;
      }
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
            <p className="small-note">यह वेबसाइट का सेटअप टोकन है। इसमें 8 और 9 जैसे अंक हो सकते हैं। इसे Google Authenticator में नहीं डालना है।</p>
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
            <label htmlFor="totp-secret">Authenticator Secret Key (निजी रखें)</label>
            <input id="totp-secret" readOnly value={pending.secret} onFocus={e=>e.currentTarget.select()} autoComplete="off" spellCheck={false} />
            <button type="button" onClick={copySecret}>Secret Key कॉपी करें</button>
            {copyStatus ? <p className="small-note" role="status">{copyStatus}</p> : null}
            <p className="small-note">Google Authenticator में + → Enter a setup key चुनें। Account name में SiteSeva Admin लिखें। ऊपर की Key को Secret key बॉक्स में Paste करें और Time based चुनें।</p>
            <p className="small-note">ध्यान दें: केवल ऊपर वाली Secret Key डालें। पूरा otpauth:// लिंक, Bootstrap Token या वेबसाइट का URL नहीं डालना है।</p>
            <label htmlFor="totp-code">Authenticator का 6 अंकों का कोड</label>
            <input id="totp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} required />
            <button type="submit" disabled={busy || code.length!==6}>{busy ? "सत्यापन हो रहा है…" : "सत्यापित करके Admin बनाएँ"}</button>
          </form>
        )}
        {error ? <p className="error" role="alert">{error}</p> : null}
        <p className="small-note">पासवर्ड, Secret Key और Authenticator कोड किसी के साथ साझा न करें। सेटअप पूरा होने पर यह पेज बंद हो जाएगा।</p>
      </section>
    </main>
  );
}
