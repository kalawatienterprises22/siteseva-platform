import {redirect} from "next/navigation";
import {getCurrentUser} from "@/lib/auth";
import {getDb} from "@/lib/db";
import {RoleWorkspace} from "@/components/role-workspace";
export const dynamic="force-dynamic";
export default async function DashboardPage(){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.roles.includes("SUPER_ADMIN"))redirect("/super-admin");
 const c=await getDb().connect();let org:{id:string;name:string}|null=null;
 try{await c.query("BEGIN");await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);const r=await c.query<{id:string;name:string}>("SELECT o.id,o.name FROM app_org_memberships m JOIN app_organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.membership_status='ACTIVE' AND o.status='ACTIVE' ORDER BY m.created_at LIMIT 1",[user.id]);org=r.rows[0]??null;await c.query("COMMIT");}catch{await c.query("ROLLBACK");}finally{c.release();}
 return <main className="dashboard-shell"><header className="dashboard-header"><div><div className="eyebrow">SiteSeva · सुरक्षित यूजर पोर्टल</div><h1>नमस्ते, {user.displayName}</h1><p>आपका अलग सुरक्षित कार्यक्षेत्र।</p></div><form action="/api/auth/logout" method="post"><button className="secondary" type="submit">लॉगआउट</button></form></header>{org?<RoleWorkspace roles={user.roles} organizationId={org.id} organizationName={org.name}/>:<section className="panel"><h2>कार्य क्षेत्र उपलब्ध नहीं है</h2><p>आपके खाते के लिए सक्रिय संगठन सदस्यता नहीं मिली। Company Super Admin से संपर्क करें।</p></section>}</main>;
}