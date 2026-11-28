import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {SiteFooter,SiteHeader,MobileNavigation} from "@/components/site-chrome";
import {CoreDashboardPanel} from "@/components/core-dashboard-panel";
export const dynamic="force-dynamic";
export default async function OwnerPage(){const user=await getCurrentUser();if(!user)redirect("/login");if(!user.roles.includes("MACHINE_OWNER"))redirect("/dashboard");return <main className="market-page"><SiteHeader/><div className="dashboard-shell"><CoreDashboardPanel view="owner" displayName={user.displayName}/></div><SiteFooter/><MobileNavigation/></main>}
