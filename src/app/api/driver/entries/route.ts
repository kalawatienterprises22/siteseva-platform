import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {getDb} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const schema=z.object({assignmentId:z.string().uuid(),entryType:z.enum(["WORK_START","WORK_STOP","DIESEL","HOUR_METER","TRIP","BREAKDOWN","REPAIR"]),numericValue:z.number().min(0).max(1000000).optional(),notes:z.string().max(1000).default("")});
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin"),host=request.headers.get("host"); if(origin&&host&&new URL(origin).host!==host)return NextResponse.json({error:"अनुमति नहीं है।"},{status:403});
 const user=await getCurrentUser();if(!user||!user.roles.includes("DRIVER"))return NextResponse.json({error:"केवल अधिकृत Driver Entry कर सकता है।"},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"जानकारी जाँचें।"},{status:400});
 const d=parsed.data,c=await getDb().connect();
 try{await c.query("BEGIN");await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);
 const r=await c.query("INSERT INTO driver_activity_entries(assignment_id,driver_user_id,entry_type,numeric_value,notes) SELECT a.id,$2,$3,$4,$5 FROM machine_assignments a WHERE a.id=$1 AND a.driver_user_id=$2 AND a.status='ACTIVE' RETURNING id,entry_type,entry_at,approval_status",[d.assignmentId,user.id,d.entryType,d.numericValue??null,d.notes]);
 if(!r.rowCount){await c.query("ROLLBACK");return NextResponse.json({error:"यह मशीन अभी आपके नाम Assign नहीं है।"},{status:403});}
 await c.query("INSERT INTO app_audit_logs(actor_user_id,actor_role_key,action,target_type,target_id,outcome,details) VALUES($1,'DRIVER','DRIVER_ENTRY_SUBMITTED','DRIVER_ACTIVITY',$2,'SUCCESS',$3::jsonb)",[user.id,r.rows[0].id,JSON.stringify({entryType:d.entryType})]);
 await c.query("COMMIT");return NextResponse.json({ok:true,entry:r.rows[0]},{status:201});
 }catch{await c.query("ROLLBACK");return NextResponse.json({error:"Entry सेव नहीं हुई।"},{status:403});}finally{c.release();}
}
