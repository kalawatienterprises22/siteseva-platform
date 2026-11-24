import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteSeva",
  description: "Independent construction operations and marketplace platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="hi"><body>{children}</body></html>;
}
