import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {getCurrentUser} from "@/lib/auth";
import {getDb} from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
async function admin(){const u=await getCurrentUser();return u&&u.roles.includes("SUPER_ADMIN")?u:null;}
export async function GET(){
 const user=await admin();if(!user)return NextResponse.json({error:"Access denied."},{status:403});
 const c=await getDb().connect();
 try{await c.query("BEGIN");await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);await c.query("SELECT set_config('app.is_super_admin','true',true)");
 const [users,orgs,machines,assignments,entries,audit]=await Promise.all([
 c.query("SELECT u.id,u.display_name,u.mobile_e164,u.status,u.created_at,COALESCE(array_agg(DISTINCT r.role_key) FILTER(WHERE r.role_key IS NOT NULL),'{}') AS roles FROM app_users u LEFT JOIN app_user_roles ur ON ur.user_id=u.id LEFT JOIN app_roles r ON r.id=ur.role_id GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100"),
 c.query("SELECT id,name,organization_type,status,verification_status,gst_number,city,district,state,pincode FROM app_organizations ORDER BY created_at DESC LIMIT 100"),
 c.query("SELECT l.id,l.title,l.category,l.location_text,l.status,l.availability_status,l.owner_user_id,u.display_name AS owner_name FROM marketplace_listings l JOIN app_users u ON u.id=l.owner_user_id ORDER BY l.created_at DESC LIMIT 100"),
 c.query("SELECT a.id,a.site_name,a.site_location,a.status,l.title AS machine_title,u.display_name AS driver_name FROM machine_assignments a JOIN marketplace_listings l ON l.id=a.machine_listing_id LEFT JOIN app_users u ON u.id=a.driver_user_id ORDER BY a.created_at DESC LIMIT 50"),
 c.query("SELECT e.id,e.entry_type,e.entry_at,e.numeric_value,e.notes,e.approval_status,u.display_name AS driver_name,a.site_name FROM driver_activity_entries e JOIN app_users u ON u.id=e.driver_user_id JOIN machine_assignments a ON a.id=e.assignment_id ORDER BY e.created_at DESC LIMIT 50"),
 c.query("SELECT id,action,target_type,target_id,outcome,created_at FROM app_audit_logs ORDER BY created_at DESC LIMIT 40")
 ]);
 await c.query("COMMIT");return NextResponse.json({users:users.rows,organizations:orgs.rows,machines:machines.rows,assignments:assignments.rows,driverEntries:entries.rows,audit:audit.rows},{headers:{"Cache-Control":"no-store"}});
 }catch{await c.query("ROLLBACK");return NextResponse.json({error:"Management data unavailable."},{status:503});}finally{c.release();}
}
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("user_status"),userId:z.string().uuid(),status:z.enum(["ACTIVE","SUSPENDED","LOCKED"])}),
 z.object({action:z.literal("organization_status"),organizationId:z.string().uuid(),status:z.enum(["ACTIVE","SUSPENDED"]),verificationStatus:z.enum(["PENDING","IN_REVIEW","VERIFIED","REJECTED"]).optional()}),
 z.object({action:z.literal("listing_status"),listingId:z.string().uuid(),status:z.enum(["APPROVED","REJECTED","PAUSED","ARCHIVED"])}),
 z.object({action:z.literal("assign_machine"),listingId:z.string().uuid(),contractorOrganizationId:z.string().uuid().optional(),driverUserId:z.string().uuid().optional(),siteName:z.string().trim().min(2).max(160),siteLocation:z.string().trim().min(2).max(240),startsAt:z.string().datetime().optional()}),
 z.object({action:z.literal("review_driver_entry"),entryId:z.string().uuid(),decision:z.enum(["APPROVED","REJECTED"]),note:z.string().max(500).default("")})
]);
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin"),host=req.headers.get("host");if(!origin||!host||new URL(origin).host!==host)return NextResponse.json({error:"Invalid request origin."},{status:403});
 const user=await admin();if(!user)return NextResponse.json({error:"Access denied."},{status:403});
 const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Invalid management action."},{status:400});
 const d=p.data,c=await getDb().connect();
 try{await c.query("BEGIN");await c.query("SELECT set_config('app.user_id',$1,true)",[user.id]);await c.query("SELECT set_config('app.is_super_admin','true',true)");
 let target="",action="";
 if(d.action==="user_status"){if(d.userId===user.id){await c.query("ROLLBACK");return NextResponse.json({error:"अपने Super Admin खाते की स्थिति यहाँ नहीं बदल सकते।"},{status:400});}const r=await c.query("UPDATE app_users SET status=$1,updated_at=now() WHERE id=$2 RETURNING id",[d.status,d.userId]);if(!r.rowCount)throw new Error("User not found");target=d.userId;action="ADMIN_USER_STATUS_CHANGED";}
 if(d.action==="organization_status"){const r=await c.query("UPDATE app_organizations SET status=$1,verification_status=COALESCE($2,verification_status),updated_at=now() WHERE id=$3 RETURNING id",[d.status,d.verificationStatus??null,d.organizationId]);if(!r.rowCount)throw new Error("Organization not found");target=d.organizationId;action="ADMIN_ORGANIZATION_STATUS_CHANGED";}
 if(d.action==="listing_status"){const r=await c.query("UPDATE marketplace_listings SET status=$1,updated_at=now() WHERE id=$2 RETURNING id",[d.status,d.listingId]);if(!r.rowCount)throw new Error("Listing not found");target=d.listingId;action="ADMIN_MACHINE_LISTING_STATUS_CHANGED";}
 if(d.action==="assign_machine"){const listing=await c.query("SELECT owner_user_id FROM marketplace_listings WHERE id=$1",[d.listingId]);if(!listing.rowCount)throw new Error("Machine not found");if(d.driverUserId){const driver=await c.query("SELECT 1 FROM app_user_roles ur JOIN app_roles r ON r.id=ur.role_id JOIN app_users u ON u.id=ur.user_id WHERE ur.user_id=$1 AND r.role_key='DRIVER' AND u.status='ACTIVE'",[d.driverUserId]);if(!driver.rowCount)throw new Error("Driver is not active");}const r=await c.query("INSERT INTO machine_assignments(machine_listing_id,owner_user_id,contractor_organization_id,driver_user_id,site_name,site_location,starts_at,status) VALUES($1,$2,$3,$4,$5,$6,COALESCE($7::timestamptz,now()),'ACTIVE') RETURNING id",[d.listingId,listing.rows[0].owner_user_id,d.contractorOrganizationId??null,d.driverUserId??null,d.siteName,d.siteLocation,d.startsAt??null]);target=r.rows[0].id;action="MACHINE_ASSIGNMENT_CREATED";}
 if(d.action==="review_driver_entry"){const r=await c.query("UPDATE driver_activity_entries SET approval_status=$1,reviewed_by=$2,reviewed_at=now(),review_note=$3 WHERE id=$4 AND approval_status='PENDING' AND driver_user_id<>$2 RETURNING id",[d.decision,user.id,d.note,d.entryId]);if(!r.rowCount)throw new Error("Entry not found or self-approval blocked");target=d.entryId;action="DRIVER_ENTRY_REVIEWED";}
 await c.query("INSERT INTO app_audit_logs(actor_user_id,actor_role_key,action,target_type,target_id,outcome,details) VALUES($1,'SUPER_ADMIN',$2,'CORE_DASHBOARD',$3,'SUCCESS',$4::jsonb)",[user.id,action,target,JSON.stringify(d)]);await c.query("COMMIT");return NextResponse.json({ok:true,target});
 }catch{await c.query("ROLLBACK");return NextResponse.json({error:"कार्रवाई पूरी नहीं हुई। रिकॉर्ड और अनुमति जाँचें।"},{status:409});}finally{c.release();}
}
