import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({
 organizationId:z.string().uuid(),title:z.string().trim().min(3).max(160),description:z.string().max(10000).default(""),
 category:z.enum(["EXCAVATOR","JCB","CRANE","DUMPER","TRUCK","TRACTOR","OTHER"]),
 make:z.string().max(100).optional(),model:z.string().max(100).optional(),year:z.number().int().min(1950).max(2100).optional(),
 hourlyRate:z.number().min(0).max(100000000).optional(),dailyRate:z.number().min(0).max(100000000).optional(),
 location:z.string().trim().min(2).max(200),contactPhone:z.string().max(20).optional(),
 registrationNumber:z.string().max(40).optional(),capacityText:z.string().max(100).optional(),fuelType:z.string().max(30).optional(),operatorIncluded:z.boolean().optional()
});
export async function GET(){try{const result=await getDb().query("SELECT id,title,description,category,make,model,year,hourly_rate,daily_rate,location_text,availability_status,created_at FROM marketplace_listings WHERE status='APPROVED' ORDER BY created_at DESC LIMIT 100");return NextResponse.json({items:result.rows},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({error:"लिस्टिंग अभी उपलब्ध नहीं है।"},{status:503});}}
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin"),host=request.headers.get("host");if(origin&&host&&new URL(origin).host!==host)return NextResponse.json({error:"अनुमति नहीं है।"},{status:403});
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"लॉगिन जरूरी है।"},{status:401});
 if(!user.roles.some(r=>["MACHINE_OWNER","CONTRACTOR","SUPER_ADMIN"].includes(r)))return NextResponse.json({error:"इस भूमिका को मशीनरी पोस्ट करने की अनुमति नहीं है।"},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"मशीनरी विवरण जाँचें।",details:parsed.error.flatten()},{status:400});
 const d=parsed.data,db=getDb(),client=await db.connect();
 try{await client.query("BEGIN");await client.query("SELECT set_config('app.user_id',$1,true)",[user.id]);
 const result=await client.query("INSERT INTO marketplace_listings (organization_id,owner_user_id,title,description,category,make,model,year,hourly_rate,daily_rate,location_text,contact_phone,registration_number,capacity_text,fuel_type,operator_included,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'PENDING') RETURNING id,title,status,created_at",
 [d.organizationId,user.id,d.title,d.description,d.category,d.make??null,d.model??null,d.year??null,d.hourlyRate??null,d.dailyRate??null,d.location,d.contactPhone??null,d.registrationNumber??null,d.capacityText??null,d.fuelType??null,d.operatorIncluded??false]);
 await client.query("COMMIT");return NextResponse.json({ok:true,item:result.rows[0],message:"लिस्टिंग समीक्षा के लिए भेज दी गई है।"},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch{await client.query("ROLLBACK");return NextResponse.json({error:"लिस्टिंग सेव नहीं हुई। संगठन की सदस्यता जाँचें।"},{status:403});}finally{client.release();}
}
