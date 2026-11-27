import { NextRequest,NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { z } from "zod";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const decisionSchema=z.object({id:z.string().uuid(),decision:z.enum(["APPROVE","REJECT"])});

async function requireAdmin() {
  const user=await getCurrentUser();
  if(!user || !user.roles.includes("SUPER_ADMIN")) return null;
  return user;
}

export async function GET() {
  const user=await requireAdmin();
  if(!user) return NextResponse.json({error:"Access denied."},{status:403});
  const c=await getDb().connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);
    await c.query("SELECT set_config('app.is_super_admin','true',true)");
    const r=await c.query(
      "SELECT id,full_name,mobile_e164,requested_role,organization_name,gst_number,status,created_at FROM app_registration_requests WHERE status='PENDING' ORDER BY created_at ASC LIMIT 100"
    );
    await c.query("COMMIT");
    return NextResponse.json({items:r.rows},{headers:{"Cache-Control":"no-store"}});
  } catch { await c.query("ROLLBACK"); return NextResponse.json({error:"Registration requests unavailable."},{status:503}); }
  finally {c.release();}
}

export async function POST(request:NextRequest) {
  const origin=request.headers.get("origin"),host=request.headers.get("host");
  if(!origin || !host || new URL(origin).host!==host) return NextResponse.json({error:"Invalid request origin."},{status:403});
  const admin=await requireAdmin();
  if(!admin) return NextResponse.json({error:"Access denied."},{status:403});
  const parsed=decisionSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"Invalid review request."},{status:400});
  const c=await getDb().connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.user_id',$1,true)",[admin.id]);
    await c.query("SELECT set_config('app.is_super_admin','true',true)");
    const found=await c.query("SELECT * FROM app_registration_requests WHERE id=$1 AND status='PENDING' FOR UPDATE",[parsed.data.id]);
    const req=found.rows[0];
    if(!req){await c.query("ROLLBACK");return NextResponse.json({error:"Request not found or already reviewed."},{status:404});}
    if(parsed.data.decision==="REJECT"){
      await c.query("UPDATE app_registration_requests SET status='REJECTED',password_hash=NULL,reviewed_by=$2,reviewed_at=now() WHERE id=$1",[req.id,admin.id]);
      await c.query("INSERT INTO app_audit_logs(actor_user_id,actor_role_key,action,target_type,target_id,outcome,details) VALUES($1,'SUPER_ADMIN','REGISTRATION_REJECTED','REGISTRATION_REQUEST',$2,'SUCCESS',$3::jsonb)",[admin.id,req.id,JSON.stringify({role:req.requested_role})]);
      await c.query("COMMIT");
      return NextResponse.json({ok:true,status:"REJECTED"});
    }
    const duplicate=await c.query("SELECT id FROM app_users WHERE mobile_e164=$1",[req.mobile_e164]);
    if(duplicate.rowCount){await c.query("ROLLBACK");return NextResponse.json({error:"इस मोबाइल नंबर का अकाउंट पहले से मौजूद है। अनुरोध अस्वीकार करें या मौजूदा अकाउंट की जाँच करें।"},{status:409});}
    const userId=randomUUID();
    await c.query("INSERT INTO app_users(id,mobile_e164,display_name,password_hash,status,mfa_enabled) VALUES($1,$2,$3,$4,'ACTIVE',false)",[userId,req.mobile_e164,req.full_name,req.password_hash]);
    let organizationId:string;
    if(req.requested_role==="PUBLIC_USER"){
      const company=await c.query("SELECT id FROM app_organizations WHERE organization_type='COMPANY' AND status='ACTIVE' ORDER BY created_at LIMIT 1");
      if(!company.rows[0]) throw new Error("Company organization missing");
      organizationId=company.rows[0].id;
    } else {
      const orgType=req.requested_role==="MACHINE_OWNER"?"MACHINE_OWNER":req.requested_role;
      const org=await c.query("INSERT INTO app_organizations(name,organization_type,status,gst_number) VALUES($1,$2,'ACTIVE',$3) RETURNING id",[req.organization_name || req.full_name,orgType,req.gst_number || null]);
      organizationId=org.rows[0].id;
    }
    await c.query("INSERT INTO app_org_memberships(organization_id,user_id,membership_status) VALUES($1,$2,'ACTIVE')",[organizationId,userId]);
    await c.query("INSERT INTO app_user_roles(user_id,role_id,organization_id,granted_by) SELECT $1,id,$2,$3 FROM app_roles WHERE role_key=$4",[userId,organizationId,admin.id,req.requested_role]);
    const workerType:Record<string,string>={CONTRACTOR:"CONTRACTOR",DRIVER:"DRIVER",OPERATOR:"OPERATOR",MACHINE_OWNER:"VEHICLE_OWNER"};
    if(workerType[req.requested_role]){
      await c.query("SELECT set_config('app.user_id',$1,true)",[userId]);
      await c.query("INSERT INTO worker_profiles(user_id,organization_id,worker_type,full_name,phone) VALUES($1,$2,$3,$4,$5)",[userId,organizationId,workerType[req.requested_role],req.full_name,req.mobile_e164]);
      await c.query("SELECT set_config('app.user_id',$1,true)",[admin.id]);
    }
    await c.query("UPDATE app_registration_requests SET status='APPROVED',password_hash=NULL,reviewed_by=$2,reviewed_at=now() WHERE id=$1",[req.id,admin.id]);
    await c.query("INSERT INTO app_audit_logs(actor_user_id,actor_role_key,action,target_type,target_id,outcome,details) VALUES($1,'SUPER_ADMIN','REGISTRATION_APPROVED','USER',$2,'SUCCESS',$3::jsonb)",[admin.id,userId,JSON.stringify({role:req.requested_role,organizationId})]);
    await c.query("COMMIT");
    return NextResponse.json({ok:true,status:"APPROVED",userId});
  } catch {
    await c.query("ROLLBACK");
    return NextResponse.json({error:"खाता सक्रिय नहीं हो सका। मोबाइल, GSTIN और भूमिका की जाँच करें।"},{status:409});
  } finally {c.release();}
}
