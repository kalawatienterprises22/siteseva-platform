import {NextRequest,NextResponse} from "next/server";
import {getCurrentUser} from "@/lib/auth";
import {getDb} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"लॉगिन जरूरी है।"},{status:401});
 const view=request.nextUrl.searchParams.get("view");
 const required=view==="owner"?"MACHINE_OWNER":view==="contractor"?"CONTRACTOR":view==="driver"?"DRIVER":null;
 if(!required||!user.roles.includes(required))return NextResponse.json({error:"इस Dashboard की अनुमति नहीं है।"},{status:403});
 const c=await getDb().connect();
 try{
  await c.query("BEGIN"); await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);
  if(view==="owner"){
   const [machines,assignments,logs]=await Promise.all([
    c.query("SELECT id,title,category,make,model,location_text,daily_rate,hourly_rate,status,availability_status,created_at FROM marketplace_listings WHERE owner_user_id=$1 ORDER BY created_at DESC LIMIT 100",[user.id]),
    c.query("SELECT a.id,a.site_name,a.site_location,a.status,a.starts_at,l.title AS machine_title,u.display_name AS driver_name FROM machine_assignments a JOIN marketplace_listings l ON l.id=a.machine_listing_id LEFT JOIN app_users u ON u.id=a.driver_user_id WHERE a.owner_user_id=$1 ORDER BY a.starts_at DESC LIMIT 100",[user.id]),
    c.query("SELECT w.id,w.work_date,w.running_hours,w.diesel_litres,w.breakdown_hours,w.approval_status,l.title AS machine_title FROM work_logs w LEFT JOIN marketplace_listings l ON l.id=w.equipment_listing_id WHERE l.owner_user_id=$1 ORDER BY w.work_date DESC LIMIT 30",[user.id])
   ]);
   await c.query("COMMIT"); return NextResponse.json({machines:machines.rows,assignments:assignments.rows,workLogs:logs.rows},{headers:{"Cache-Control":"no-store"}});
  }
  if(view==="contractor"){
   const [assignments,tenders,logs]=await Promise.all([
    c.query("SELECT a.id,a.site_name,a.site_location,a.status,a.starts_at,l.title AS machine_title,u.display_name AS driver_name FROM machine_assignments a JOIN app_org_memberships m ON m.organization_id=a.contractor_organization_id AND m.user_id=$1 AND m.membership_status='ACTIVE' JOIN marketplace_listings l ON l.id=a.machine_listing_id LEFT JOIN app_users u ON u.id=a.driver_user_id ORDER BY a.starts_at DESC LIMIT 100",[user.id]),
    c.query("SELECT id,title,category,location_text,status,deadline,created_at FROM tenders WHERE created_by=$1 ORDER BY created_at DESC LIMIT 50",[user.id]),
    c.query("SELECT w.id,w.work_date,w.running_hours,w.diesel_litres,w.breakdown_hours,w.approval_status FROM work_logs w JOIN app_org_memberships m ON m.organization_id=w.organization_id AND m.user_id=$1 AND m.membership_status='ACTIVE' ORDER BY w.work_date DESC LIMIT 30",[user.id])
   ]);
   await c.query("COMMIT"); return NextResponse.json({assignments:assignments.rows,tenders:tenders.rows,workLogs:logs.rows},{headers:{"Cache-Control":"no-store"}});
  }
  // A transaction-bound PoolClient must execute queries sequentially.
  // Running Promise.all on one pg client can queue overlapping queries and slow the dashboard.
  const profile=await c.query("SELECT full_name,worker_type,phone,experience_years,skills,service_area,verification_status FROM worker_profiles WHERE user_id=$1",[user.id]);
  const assignments=await c.query("SELECT a.id,a.site_name,a.site_location,a.status,a.starts_at,a.ends_at,l.title AS machine_title,l.category,l.make,l.model FROM machine_assignments a JOIN marketplace_listings l ON l.id=a.machine_listing_id WHERE a.driver_user_id=$1 AND a.status IN ('ACTIVE','PLANNED') ORDER BY a.starts_at DESC LIMIT 30",[user.id]);
  const entries=await c.query("SELECT e.id,e.assignment_id,e.entry_type,e.entry_at,e.numeric_value,e.notes,e.approval_status,e.review_note FROM driver_activity_entries e WHERE e.driver_user_id=$1 ORDER BY e.entry_at DESC LIMIT 30",[user.id]);
  await c.query("COMMIT"); return NextResponse.json({profile:profile.rows[0]??null,assignments:assignments.rows,entries:entries.rows},{headers:{"Cache-Control":"no-store"}});
 }catch{await c.query("ROLLBACK");return NextResponse.json({error:"Dashboard डेटा अभी उपलब्ध नहीं है।"},{status:503});}finally{c.release();}
}
