import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {SiteFooter,SiteHeader,MobileNavigation} from "@/components/site-chrome";
import {CoreDashboardPanel} from "@/components/core-dashboard-panel";
export const dynamic="force-dynamic";
export default async function DriverPage(){const user=await getCurrentUser();if(!user)redirect("/login");if(!user.roles.includes("DRIVER"))redirect("/dashboard");return <main className="market-page"><SiteHeader/><div className="dashboard-shell"><CoreDashboardPanel view="driver" displayName={user.displayName}/></div><SiteFooter/><MobileNavigation/></main>}
