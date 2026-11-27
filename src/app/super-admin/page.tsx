import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ModerationQueue } from "@/components/moderation-queue";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-admin/login");
  if (!user.roles.includes("SUPER_ADMIN")) redirect("/dashboard");

  const client = await getDb().connect();
  let items: { id: string; title: string; detail: string; kind: "listing" | "tender" | "worker" }[] = [];
  let totals = { listings: 0, tenders: 0, workers: 0, runningHours: 0, diesel: 0, breakdown: 0, workDays: 0 };
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    const [listings, tenders, workers, reports] = await Promise.all([
      client.query<{ id: string; title: string; category: string; location_text: string }>("SELECT id,title,category,location_text FROM marketplace_listings WHERE status='PENDING' ORDER BY created_at LIMIT 50"),
      client.query<{ id: string; title: string; category: string; location_text: string }>("SELECT id,title,category,location_text FROM tenders WHERE status='PENDING' ORDER BY created_at LIMIT 50"),
      client.query<{ id: string; full_name: string; worker_type: string; phone: string; service_area: string | null }>("SELECT id,full_name,worker_type,phone,service_area FROM worker_profiles WHERE verification_status='PENDING' ORDER BY created_at LIMIT 50"),
      client.query("SELECT COALESCE(sum(running_hours),0)::numeric AS running_hours, COALESCE(sum(diesel_litres),0)::numeric AS diesel, COALESCE(sum(breakdown_hours),0)::numeric AS breakdown, count(DISTINCT work_date)::int AS work_days FROM work_logs"),
    ]);
    items = [
      ...listings.rows.map((r) => ({ id: r.id, title: r.title, detail: r.category + " · " + r.location_text, kind: "listing" as const })),
      ...tenders.rows.map((r) => ({ id: r.id, title: r.title, detail: r.category + " · " + r.location_text, kind: "tender" as const })),
      ...workers.rows.map((r) => ({ id: r.id, title: r.full_name, detail: r.worker_type + " · " + r.phone + (r.service_area ? " · " + r.service_area : ""), kind: "worker" as const })),
    ];
    totals = {
      listings: listings.rowCount ?? 0, tenders: tenders.rowCount ?? 0, workers: workers.rowCount ?? 0,
      runningHours: Number(reports.rows[0]?.running_hours ?? 0), diesel: Number(reports.rows[0]?.diesel ?? 0),
      breakdown: Number(reports.rows[0]?.breakdown ?? 0), workDays: Number(reports.rows[0]?.work_days ?? 0),
    };
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
  } finally { client.release(); }

  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><div className="eyebrow">SiteSeva · Company Control</div><h1>नमस्ते, {user.displayName}</h1><p>Company Super Admin Dashboard</p></div><form action="/api/auth/logout" method="post"><button className="secondary" type="submit">लॉगआउट</button></form></header>
    <section className="stat-grid">
      <article className="stat-card"><span>लंबित मशीनरी</span><strong>{totals.listings}</strong></article>
      <article className="stat-card"><span>लंबित टेंडर</span><strong>{totals.tenders}</strong></article>
      <article className="stat-card"><span>लंबित वर्कर</span><strong>{totals.workers}</strong></article>
      <article className="stat-card"><span>साइट पर दर्ज दिन</span><strong>{totals.workDays}</strong></article>
    </section>
    <section className="panel"><div className="section-heading"><div><div className="eyebrow">साइट ऑपरेशन रिपोर्ट</div><h2>कुल संचालन आँकड़े</h2></div></div>
      <div className="stat-grid report-grid"><article className="stat-card"><span>रनिंग घंटे</span><strong>{totals.runningHours.toLocaleString("en-IN")}</strong></article><article className="stat-card"><span>डीजल (लीटर)</span><strong>{totals.diesel.toLocaleString("en-IN")}</strong></article><article className="stat-card"><span>ब्रेकडाउन घंटे</span><strong>{totals.breakdown.toLocaleString("en-IN")}</strong></article></div>
    </section>
    <ModerationQueue items={items} />
    <section className="panel"><div className="eyebrow">अकाउंट सुरक्षा</div><h2>सुरक्षित Super Admin प्रवेश</h2><p>यह पैनल केवल SUPER_ADMIN भूमिका और MFA-सक्रिय खाते के लिए उपलब्ध है। हर अनुमोदन/अस्वीकृति ऑडिट लॉग में दर्ज होती है।</p></section>
  </main>;
}
