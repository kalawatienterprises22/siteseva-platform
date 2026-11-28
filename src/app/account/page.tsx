import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteFooter, SiteHeader, MobileNavigation } from "@/components/site-chrome";
import { DriverAccountSettings } from "@/components/driver-account-settings";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.includes("DRIVER")) redirect("/dashboard");
  return <main className="market-page"><SiteHeader driverMode/><DriverAccountSettings/><SiteFooter/><MobileNavigation driverMode/></main>;
}
