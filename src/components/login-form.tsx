"use client";

import { FormEvent, useState } from "react";

type Props = {
  endpoint: string;
  heading: string;
  description: string;
};

export function LoginForm({ endpoint, heading, description }: Props) {
  const [mobile, setMobile] = useState("+91");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ mobile: mobile.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "लॉगिन असफल रहा।");
        return;
      }
      window.location.assign(data.redirectTo);
    } catch {
      setError("नेटवर्क समस्या है। दोबारा प्रयास करें।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="panel login-panel">
        <div className="eyebrow">SiteSeva · सुरक्षित प्रवेश</div>
        <h1>{heading}</h1>
        <p>{description}</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="mobile">मोबाइल नंबर</label>
          <input
            id="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="+919876543210"
            required
          />
          <label htmlFor="password">पासवर्ड</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={128}
            required
          />
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? "जाँच हो रही है…" : "सुरक्षित लॉगिन"}
          </button>
        </form>
        <p className="small-note">पासवर्ड किसी के साथ साझा न करें। लगातार गलत प्रयास पर अस्थायी लॉक लग सकता है।</p>
      </section>
    </main>
  );
}
