"use client";

import { FormEvent, useEffect, useState } from "react";

type Props = {
  endpoint: string;
  heading: string;
  headingEn: string;
  description: string;
  descriptionEn: string;
  mfaRequired?: boolean;
};

const words = {
  hi: { secure: "SiteSeva · सुरक्षित प्रवेश", mobile: "मोबाइल नंबर", password: "पासवर्ड", otp: "Authenticator ऐप का 6 अंकों का कोड", busy: "जाँच हो रही है…", submit: "सुरक्षित लॉगिन", note: "पासवर्ड किसी के साथ साझा न करें। लगातार गलत प्रयास पर अस्थायी लॉक लग सकता है।", failed: "लॉगिन असफल रहा।", network: "नेटवर्क समस्या है। दोबारा प्रयास करें।" },
  en: { secure: "SiteSeva · Secure access", mobile: "Mobile number", password: "Password", otp: "6-digit Authenticator code", busy: "Checking…", submit: "Secure Login", note: "Never share your password. Repeated failed attempts may temporarily lock your account.", failed: "Login failed.", network: "Network error. Please try again." },
};

export function LoginForm({ endpoint, heading, headingEn, description, descriptionEn, mfaRequired = false }: Props) {
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [mobile, setMobile] = useState("+91");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const t = words[language];

  useEffect(() => {
    const saved = document.cookie.split("; ").find((item) => item.startsWith("siteSevaLanguage="))?.split("=")[1];
    if (saved === "en" || saved === "hi") setLanguage(saved);
  }, []);

  function chooseLanguage(next: "hi" | "en") {
    setLanguage(next);
    document.cookie = `siteSevaLanguage=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    document.cookie = `siteSevaLanguage=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ mobile: mobile.trim(), password, ...(mfaRequired ? { otpCode } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t.failed);
        return;
      }
      window.location.assign(data.redirectTo);
    } catch {
      setError(t.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="panel login-panel">
        <div className="login-topline">
          <div className="eyebrow">{t.secure}</div>
          <div className="language-switch" role="group" aria-label="Choose language">
            <button type="button" className={language === "hi" ? "language-option active" : "language-option"} aria-pressed={language === "hi"} onClick={() => chooseLanguage("hi")}>हिंदी</button>
            <button type="button" className={language === "en" ? "language-option active" : "language-option"} aria-pressed={language === "en"} onClick={() => chooseLanguage("en")}>English</button>
          </div>
        </div>
        <h1>{language === "hi" ? heading : headingEn}</h1>
        <p>{language === "hi" ? description : descriptionEn}</p>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="mobile">{t.mobile}</label>
          <input id="mobile" type="tel" inputMode="tel" autoComplete="username" value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="+919876543210" required />
          <label htmlFor="password">{t.password}</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required />
          {mfaRequired ? <>
            <label htmlFor="otp-code">{t.otp}</label>
            <input id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
          </> : null}
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? t.busy : t.submit}</button>
        </form>
        <p className="small-note">{t.note}</p>
      </section>
    </main>
  );
}
