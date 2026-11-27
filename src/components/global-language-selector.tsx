"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function GlobalLanguageSelector() {
  const pathname = usePathname();
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  useEffect(() => {
    const saved = document.cookie.split("; ").find((item) => item.startsWith("siteSevaLanguage="))?.split("=")[1];
    if (saved === "en" || saved === "hi") setLanguage(saved);
  }, []);
  if (pathname === "/super-admin") return null;
  function choose(next: "hi" | "en") {
    setLanguage(next);
    document.cookie = `siteSevaLanguage=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.location.reload();
  }
  return <div className="global-language" role="group" aria-label="Choose language">
    <span>{language === "hi" ? "भाषा" : "Language"}</span>
    <button type="button" className={language === "hi" ? "active" : ""} aria-pressed={language === "hi"} onClick={() => choose("hi")}>हिंदी</button>
    <button type="button" className={language === "en" ? "active" : ""} aria-pressed={language === "en"} onClick={() => choose("en")}>English</button>
  </div>;
}
