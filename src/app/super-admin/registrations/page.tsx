import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { RegistrationReview } from "@/components/registration-review";
export const dynamic="force-dynamic";
export default async function RegistrationsPage(){
  const user=await getCurrentUser();
  if(!user) redirect("/super-admin/login");
  if(!user.roles.includes("SUPER_ADMIN")) redirect("/dashboard");
  const c=await getDb().connect();
  let items:{id:string;full_name:string;mobile_e164:string;requested_role:string;organization_name:string|null;gst_number:string|null;created_at:string}[]=[];
  try{
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);
    await c.query("SELECT set_config('app.is_super_admin','true',true)");
    const r=await c.query("SELECT id,full_name,mobile_e164,requested_role,organization_name,gst_number,created_at FROM app_registration_requests WHERE status='PENDING' ORDER BY created_at ASC LIMIT 100");
    items=r.rows;
    await c.query("COMMIT");
  }catch{await c.query("ROLLBACK");}
  finally{c.release();}
  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><div className="eyebrow">SiteSeva · Company Control</div><h1>Registration Requests</h1><p>मोबाइल और GST दस्तावेज़ स्वयं जाँचकर ही अकाउंट Approve करें।</p></div><Link className="secondary" href="/super-admin">Dashboard</Link></header>
    <RegistrationReview initialItems={items.map(x=>({...x,created_at:String(x.created_at)}))}/>
    <p className="small-note">SMS OTP और GST portal API verification अभी कनेक्ट नहीं हैं। Approval से पहले वास्तविक दस्तावेज़ और मोबाइल नंबर की मैन्युअल जाँच अनिवार्य है।</p>
  </main>;
}
