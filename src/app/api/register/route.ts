import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
  role: z.enum(["CONTRACTOR","LABOUR_CONTRACTOR","MACHINE_OWNER","DRIVER","OPERATOR","PUBLIC_USER"]),
  organizationName: z.string().trim().max(160).optional().or(z.literal("")),
  gstNumber: z.string().trim().toUpperCase().optional().or(z.literal("")),
  password: z.string().min(12).max(128),
}).superRefine((value, ctx) => {
  if (["CONTRACTOR","LABOUR_CONTRACTOR"].includes(value.role)) {
    if (!value.organizationName || value.organizationName.length < 2) ctx.addIssue({code:"custom",path:["organizationName"],message:"कंपनी/फर्म का नाम जरूरी है।"});
    if (!value.gstNumber || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.gstNumber)) ctx.addIssue({code:"custom",path:["gstNumber"],message:"मान्य GSTIN दर्ज करें।"});
  }
});

function sameOrigin(request: NextRequest) {
  const origin=request.headers.get("origin"), host=request.headers.get("host");
  if(!origin || !host) return false;
  try { return new URL(origin).host===host; } catch { return false; }
}

export async function POST(request: NextRequest) {
  if(!sameOrigin(request)) return NextResponse.json({error:"अनुरोध की पुष्टि नहीं हो सकी।"},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message ?? "कृपया सभी विवरण सही भरें।"},{status:400});
  const forwarded=request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const ipFingerprint=createHash("sha256").update(forwarded.split(",")[0].trim()).digest("hex");
  const db=getDb();
  try {
    const rate=await db.query("SELECT count(*)::int AS count FROM app_registration_requests WHERE ip_fingerprint=$1 AND created_at>now()-interval '1 hour'",[ipFingerprint]);
    if(Number(rate.rows[0]?.count ?? 0)>=5) return NextResponse.json({error:"बहुत अधिक अनुरोध हुए हैं। कृपया एक घंटे बाद प्रयास करें।"},{status:429});
    const passwordHash=await bcrypt.hash(parsed.data.password,12);
    await db.query(
      `INSERT INTO app_registration_requests(full_name,mobile_e164,requested_role,organization_name,gst_number,password_hash,ip_fingerprint)
       VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(mobile_e164) DO NOTHING`,
      [parsed.data.fullName,parsed.data.mobile,parsed.data.role,parsed.data.organizationName || null,parsed.data.gstNumber || null,passwordHash,ipFingerprint],
    );
    return NextResponse.json({ok:true,message:"आपका अनुरोध प्राप्त हुआ। Company Super Admin द्वारा मोबाइल और दस्तावेज़ की जाँच के बाद ही खाता सक्रिय होगा।"},{status:202,headers:{"Cache-Control":"no-store"}});
  } catch {
    return NextResponse.json({error:"अभी अनुरोध सेव नहीं हो सका। कृपया बाद में प्रयास करें।"},{status:503});
  }
}
