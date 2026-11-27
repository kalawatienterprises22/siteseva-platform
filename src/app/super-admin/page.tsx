import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ModerationQueue } from "@/components/moderation-queue";

export const dynamic = "force-dynamic";

type ListingRow = { id:string; title:string; category:string; location_text:string };
type TenderRow = { id:string; title:string; category:string; location_text:string };
type WorkerRow = { id:string; full_name:string; worker_type:string; phone:string; service_area:string|null };
type ReportRow = { running_hours:string; diesel:string; breakdown:string; work_days:number };

export default async function SuperAdminPage() {
  const language=(await cookies()).get("siteSevaLanguage")?.value==="en"?"en":"hi";
  const en=language==="en";
  const user=await getCurrentUser();
  if(!user) redirect("/super-admin/login");
  if(!user.roles.includes("SUPER_ADMIN")) redirect("/dashboard");

  const client=await getDb().connect();
  let items:{id:string;title:string;detail:string;kind:"listing"|"tender"|"worker"}[]=[];
  let totals={listings:0,tenders:0,workers:0,runningHours:0,diesel:0,breakdown:0,workDays:0};
  let registrationCount=0;
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id',$1,true)",[user.id]);
    await client.query("SELECT set_config('app.is_super_admin','true',true)");
    const [listings,tenders,workers,reports,registrations]=await Promise.all([
      client.query<ListingRow>("SELECT id,title,category,location_text FROM marketplace_listings WHERE status='PENDING' ORDER BY created_at LIMIT 50"),
      client.query<TenderRow>("SELECT id,title,category,location_text FROM tenders WHERE status='PENDING' ORDER BY created_at LIMIT 50"),
      client.query<WorkerRow>("SELECT id,full_name,worker_type,phone,service_area FROM worker_profiles WHERE verification_status='PENDING' ORDER BY created_at LIMIT 50"),
      client.query<ReportRow>("SELECT COALESCE(sum(running_hours),0)::numeric AS running_hours,COALESCE(sum(diesel_litres),0)::numeric AS diesel,COALESCE(sum(breakdown_hours),0)::numeric AS breakdown,count(DISTINCT work_date)::int AS work_days FROM work_logs"),
      client.query<{count:number}>("SELECT count(*)::int AS count FROM app_registration_requests WHERE status='PENDING'")
    ]);
    items=[
      ...listings.rows.map(r=>({id:r.id,title:r.title,detail:r.category+" · "+r.location_text,kind:"listing" as const})),
      ...tenders.rows.map(r=>({id:r.id,title:r.title,detail:r.category+" · "+r.location_text,kind:"tender" as const})),
      ...workers.rows.map(r=>({id:r.id,title:r.full_name,detail:r.worker_type+" · "+r.phone+(r.service_area?" · "+r.service_area:""),kind:"worker" as const}))
    ];
    totals={listings:listings.rowCount??0,tenders:tenders.rowCount??0,workers:workers.rowCount??0,runningHours:Number(reports.rows[0]?.running_hours??0),diesel:Number(reports.rows[0]?.diesel??0),breakdown:Number(reports.rows[0]?.breakdown??0),workDays:Number(reports.rows[0]?.work_days??0)};
    registrationCount=Number(registrations.rows[0]?.count??0);
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
  } finally { client.release(); }

  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><div className="eyebrow">SiteSeva · Company Control</div><h1>{en?"Welcome":"नमस्ते"}, {user.displayName}</h1><p>Company Super Admin Dashboard</p></div><div className="hero-actions"><Link className="secondary" href="/super-admin/registrations">{en?"Registrations":"नए रजिस्ट्रेशन"} ({registrationCount})</Link><form action="/api/auth/logout" method="post"><button className="secondary" type="submit">{en?"Log out":"लॉगआउट"}</button></form></div></header>
    <section className="stat-grid"><article className="stat-card"><span>{en?"Pending machinery":"लंबित मशीनरी"}</span><strong>{totals.listings}</strong></article><article className="stat-card"><span>{en?"Pending tenders":"लंबित टेंडर"}</span><strong>{totals.tenders}</strong></article><article className="stat-card"><span>{en?"Pending workers":"लंबित वर्कर"}</span><strong>{totals.workers}</strong></article><article className="stat-card"><span>{en?"Recorded site days":"साइट पर दर्ज दिन"}</span><strong>{totals.workDays}</strong></article></section>
    <section className="panel"><div className="section-heading"><div><div className="eyebrow">{en?"Site operations report":"साइट ऑपरेशन रिपोर्ट"}</div><h2>{en?"Overall operation statistics":"कुल संचालन आँकड़े"}</h2></div></div><div className="stat-grid report-grid"><article className="stat-card"><span>{en?"Running hours":"रनिंग घंटे"}</span><strong>{totals.runningHours.toLocaleString("en-IN")}</strong></article><article className="stat-card"><span>{en?"Diesel (litres)":"डीजल (लीटर)"}</span><strong>{totals.diesel.toLocaleString("en-IN")}</strong></article><article className="stat-card"><span>{en?"Breakdown hours":"ब्रेकडाउन घंटे"}</span><strong>{totals.breakdown.toLocaleString("en-IN")}</strong></article></div></section>
    <ModerationQueue items={items} language={language}/>
    <section className="panel"><div className="eyebrow">{en?"Account security":"अकाउंट सुरक्षा"}</div><h2>{en?"Secure Super Admin access":"सुरक्षित Super Admin प्रवेश"}</h2><p>{en?"This panel is available only to accounts with the SUPER_ADMIN role and MFA enabled. Every approval or rejection is recorded in the audit log.":"यह पैनल केवल SUPER_ADMIN भूमिका और MFA-सक्रिय खाते के लिए उपलब्ध है। हर अनुमोदन/अस्वीकृति ऑडिट लॉग में दर्ज होती है।"}</p></section>
  </main>;
}
