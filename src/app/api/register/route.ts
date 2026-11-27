import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {z} from "zod";
import {getDb} from "@/lib/db";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const schema=z.object({fullName:z.string().trim().min(2).max(120),mobile:z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),role:z.enum(["CONTRACTOR","LABOUR_CONTRACTOR","MACHINE_OWNER","DRIVER","OPERATOR","PUBLIC_USER"]),organizationName:z.string().trim().max(160).optional().or(z.literal("")),gstNumber:z.string().trim().toUpperCase().optional().or(z.literal("")),password:z.string().min(12).max(128)}).superRefine((v,c)=>{if(["CONTRACTOR","LABOUR_CONTRACTOR"].includes(v.role)){if(!v.organizationName||v.organizationName.length<2)c.addIssue({code:"custom",path:["organizationName"],message:"कंपनी/फर्म का नाम जरूरी है।"});if(!v.gstNumber||!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.gstNumber))c.addIssue({code:"custom",path:["gstNumber"],message:"मान्य GSTIN दर्ज करें।"});}});
function sameOrigin(r:NextRequest){const o=r.headers.get("origin"),h=r.headers.get("host");if(!o||!h)return false;try{return new URL(o).host===h;}catch{return false;}}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:"अनुरोध की पुष्टि नहीं हो सकी।"},{status:403});
 const p=schema.safeParse(await request.json().catch(()=>null));if(!p.success)return NextResponse.json({error:p.error.issues[0]?.message??"कृपया सभी विवरण सही भरें।"},{status:400});
 const forwarded=request.headers.get("x-vercel-forwarded-for")??request.headers.get("x-forwarded-for")??"unknown";
 const ip=createHash("sha256").update(forwarded.split(",")[0].trim()).digest("hex");
 const c=await getDb().connect();
 try{await c.query("BEGIN");await c.query("SELECT set_config('app.registration_ip_fingerprint',$1,true)",[ip]);
 const rate=await c.query("SELECT count(*)::int AS count FROM app_registration_requests WHERE created_at>now()-interval '1 hour'");
 if(Number(rate.rows[0]?.count??0)>=5){await c.query("ROLLBACK");return NextResponse.json({error:"बहुत अधिक अनुरोध हुए हैं। कृपया एक घंटे बाद प्रयास करें।"},{status:429});}
 const hash=await bcrypt.hash(p.data.password,12);
 await c.query("INSERT INTO app_registration_requests(full_name,mobile_e164,requested_role,organization_name,gst_number,password_hash,ip_fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(mobile_e164) DO NOTHING",[p.data.fullName,p.data.mobile,p.data.role,p.data.organizationName||null,p.data.gstNumber||null,hash,ip]);
 await c.query("COMMIT");return NextResponse.json({ok:true,message:"आपका अनुरोध प्राप्त हुआ। Company Super Admin द्वारा मोबाइल और दस्तावेज़ की जाँच के बाद ही खाता सक्रिय होगा।"},{status:202,headers:{"Cache-Control":"no-store"}});
 }catch{await c.query("ROLLBACK");return NextResponse.json({error:"अभी अनुरोध सेव नहीं हो सका। कृपया बाद में प्रयास करें।"},{status:503});}finally{c.release();}
}