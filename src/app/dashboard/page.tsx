import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {getDb} from "@/lib/db";
import {RoleWorkspace} from "@/components/role-workspace";
import {SiteFooter,SiteHeader,MobileNavigation} from "@/components/site-chrome";
export const dynamic="force-dynamic";
export default async function DashboardPage(){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.roles.includes("SUPER_ADMIN"))redirect("/super-admin");
 const c=await getDb().connect();let org:{id:string;name:string}|null=null;
 try{await c.query("BEGIN");await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);const r=await c.query<{id:string;name:string}>("SELECT o.id,o.name FROM app_org_memberships m JOIN app_organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.membership_status='ACTIVE' AND o.status='ACTIVE' ORDER BY m.created_at LIMIT 1",[user.id]);org=r.rows[0]??null;await c.query("COMMIT");}catch{await c.query("ROLLBACK");}finally{c.release();}
 return <main className="market-page"><SiteHeader/><div className="dashboard-shell"><div className="dashboard-photo-banner"><img src="https://images.pexels.com/photos/35565815/pexels-photo-35565815.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="Excavator and tractor working at an Indian construction site" loading="lazy" decoding="async" sizes="100vw" onError={(event)=>{event.currentTarget.style.display="none"}}/><div><span>SITE SEVA · CONSTRUCTION NETWORK</span><strong>One workspace for every project.</strong></div></div><header className="dashboard-header"><div><div className="eyebrow">SITE SEVA · SECURE USER PORTAL</div><h1>नमस्ते, {user.displayName}</h1><p>Your role-based business workspace.</p></div><form action="/api/auth/logout" method="post"><button className="secondary" type="submit">लॉगआउट</button></form></header>{org?<RoleWorkspace roles={user.roles} organizationId={org.id} organizationName={org.name}/>:<section className="panel"><h2>कार्य क्षेत्र उपलब्ध नहीं है</h2><p>आपके खाते के लिए सक्रिय संगठन सदस्यता नहीं मिली। Company Super Admin से संपर्क करें।</p></section>}</div><SiteFooter/><MobileNavigation/></main>;
}