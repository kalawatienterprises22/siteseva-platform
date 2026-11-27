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
  hi: {
    secure: "SiteSeva · सुरक्षित प्रवेश",
    mobile: "मोबाइल नंबर",
    password: "पासवर्ड",
    otp: "Authenticator ऐप का 6 अंकों का कोड",
    busy: "जाँच हो रही है…",
    submit: "सुरक्षित लॉगिन",
    note: "पासवर्ड किसी के साथ साझा न करें। लगातार गलत प्रयास पर अस्थायी लॉक लग सकता है।",
    failed: "लॉगिन असफल रहा।",
    network: "नेटवर्क समस्या है। दोबारा प्रयास करें।",
  },
  en: {
    secure: "SiteSeva · Secure access",
    mobile: "Mobile number",
    password: "Password",
    otp: "6-digit Authenticator code",
    busy: "Checking…",
    submit: "Secure Login",
    note: "Never share your password. Repeated failed attempts may temporarily lock your account.",
    failed: "Login failed.",
    network: "Network error. Please try again.",
  },
};

const englishErrors: Record<string, string> = {
  "अनुमति नहीं है।": "Access denied.",
  "अनुरोध मान्य नहीं है।": "Invalid request. Please try again.",
  "मोबाइल नंबर + देश कोड के साथ और कम-से-कम 8 अक्षर का पासवर्ड डालें।": "Enter your mobile number with country code and a password of at least 8 characters.",
  "अभी लॉगिन पूरा नहीं हो सका। कृपया बाद में प्रयास करें।": "Login could not be completed. Please try again later.",
  "बहुत अधिक प्रयास हुए हैं। 15 मिनट बाद दोबारा प्रयास करें।": "Too many attempts. Please try again after 15 minutes.",
  "मोबाइल नंबर या पासवर्ड सही नहीं है, या अकाउंट सक्रिय नहीं है।": "The mobile number or password is incorrect, or the account is inactive.",
  "Authenticator ऐप का 6 अंकों का सही कोड डालें।": "Enter the correct 6-digit Authenticator code.",
  "Super Admin लॉगिन से पहले Multi-Factor Authentication (MFA) सक्रिय होना जरूरी है।": "Multi-Factor Authentication (MFA) must be enabled before Super Admin login.",
  "इस खाते को Super Admin प्रवेश की अनुमति नहीं है।": "This account is not authorized for Super Admin access.",
  "Super Admin के लिए अलग प्रवेश लिंक इस्तेमाल करें।": "This is the User Login page. Super Admins must use the separate Super Admin login page.",
};

function localizedError(message: unknown, language: "hi" | "en", fallback: string) {
  if (typeof message !== "string" || !message.trim()) return fallback;
  if (language === "hi") return message;
  return englishErrors[message] ?? fallback;
}

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
    setError((current) => current ? (next === "en" ? (Object.values(englishErrors).includes(current) ? current : "Please check your details and try again.") : current) : "");
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
        setError(localizedError(data.error, language, t.failed));
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
            <input id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))} required />
          </> : null}
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? t.busy : t.submit}</button>
        </form>
        <p className="small-note">{t.note}</p>
      </section>
    </main>
  );
}
