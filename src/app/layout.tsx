import type { Metadata } from "next";
import "./globals.css";
import { GlobalLanguageSelector } from "@/components/global-language-selector";

export const metadata: Metadata = {
  title: { default: "SiteSeva | Construction Marketplace", template: "%s | SiteSeva" },
  description: "मशीनरी, टेंडर, कोटेशन और निर्माण साइट ऑपरेशन के लिए SiteSeva प्लेटफॉर्म।",
  applicationName: "SiteSeva",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hi"><body><GlobalLanguageSelector />{children}</body></html>;
}
