import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {SiteFooter,SiteHeader,MobileNavigation} from "@/components/site-chrome";
import {CoreDashboardPanel} from "@/components/core-dashboard-panel";
export const dynamic="force-dynamic";
export default async function ContractorPage(){const user=await getCurrentUser();if(!user)redirect("/login");if(!user.roles.includes("CONTRACTOR"))redirect("/dashboard");return <main className="market-page"><SiteHeader/><div className="dashboard-shell"><CoreDashboardPanel view="contractor" displayName={user.displayName}/></div><SiteFooter/><MobileNavigation/></main>}
