import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema=z.object({
 organizationId:z.string().uuid(),title:z.string().trim().min(5).max(200),
 description:z.string().trim().min(10).max(20000),category:z.string().trim().min(2).max(80),
 location:z.string().trim().min(2).max(200),budgetMin:z.number().min(0).optional(),
 budgetMax:z.number().min(0).optional(),deadline:z.string().datetime().optional()
}).refine(v=>v.budgetMin===undefined||v.budgetMax===undefined||v.budgetMax>=v.budgetMin,{message:"अधिकतम बजट न्यूनतम बजट से कम नहीं हो सकता।"});
export async function GET() {
 try {
  const result=await getDb().query("SELECT id,title,description,category,location_text,budget_min,budget_max,deadline,created_at FROM tenders WHERE status='PUBLISHED' AND (deadline IS NULL OR deadline>=now()) ORDER BY created_at DESC LIMIT 100");
  return NextResponse.json({items:result.rows},{headers:{"Cache-Control":"no-store"}});
 } catch { return NextResponse.json({error:"टेंडर अभी उपलब्ध नहीं हैं।"},{status:503}); }
}
export async function POST(request:NextRequest) {
 const origin=request.headers.get("origin"),host=request.headers.get("host");
 if(origin&&host&&new URL(origin).host!==host) return NextResponse.json({error:"अनुमति नहीं है।"},{status:403});
 const user=await getCurrentUser();
 if(!user) return NextResponse.json({error:"लॉगिन जरूरी है।"},{status:401});
 if(!user.roles.some(r=>["CONTRACTOR","LABOUR_CONTRACTOR","SITE_SUPERVISOR","SUPER_ADMIN"].includes(r))) return NextResponse.json({error:"इस भूमिका को टेंडर पोस्ट करने की अनुमति नहीं है।"},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success) return NextResponse.json({error:"टेंडर विवरण जाँचें।",details:parsed.error.flatten()},{status:400});
 const d=parsed.data,client=await getDb().connect();
 try {
  await client.query("BEGIN"); await client.query("SELECT set_config('app.user_id',$1,true)",[user.id]);
  const result=await client.query("INSERT INTO tenders (organization_id,created_by,title,description,category,location_text,budget_min,budget_max,deadline,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING') RETURNING id,title,status,created_at",[d.organizationId,user.id,d.title,d.description,d.category,d.location,d.budgetMin??null,d.budgetMax??null,d.deadline??null]);
  await client.query("COMMIT");
  return NextResponse.json({ok:true,tender:result.rows[0],message:"टेंडर अनुमोदन के लिए भेज दिया गया है।"},{status:201,headers:{"Cache-Control":"no-store"}});
 } catch { await client.query("ROLLBACK"); return NextResponse.json({error:"टेंडर सेव नहीं हुआ। संगठन की सदस्यता जाँचें।"},{status:403}); }
 finally { client.release(); }
}
