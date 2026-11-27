import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ kind: z.enum(["listing", "tender", "worker"]), id: z.string().uuid(), decision: z.enum(["approve", "reject"]) });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: "अनुमति नहीं है।" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("SUPER_ADMIN")) return NextResponse.json({ error: "केवल Company Super Admin यह कार्रवाई कर सकता है।" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "सही रिकॉर्ड चुनें।" }, { status: 400 });
  const { kind, id, decision } = parsed.data;
  const table = kind === "listing" ? "marketplace_listings" : kind === "tender" ? "tenders" : "worker_profiles";
  const statusColumn = kind === "worker" ? "verification_status" : "status";
  const status = decision === "approve" ? (kind === "listing" ? "APPROVED" : kind === "tender" ? "PUBLISHED" : "VERIFIED") : "REJECTED";
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    const result = await client.query(`UPDATE ${table} SET ${statusColumn} = $1, updated_at = now() WHERE id = $2 AND ${statusColumn} = 'PENDING' RETURNING id`, [status, id]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "यह रिकॉर्ड नहीं मिला या पहले ही समीक्षा हो चुका है।" }, { status: 404 });
    }
    await client.query("INSERT INTO app_audit_logs(actor_user_id, actor_role_key, action, target_type, target_id, outcome, details) VALUES($1,'SUPER_ADMIN',$2,$3,$4,'SUCCESS',$5::jsonb)", [user.id, decision === "approve" ? "RECORD_APPROVED" : "RECORD_REJECTED", kind.toUpperCase(), id, JSON.stringify({ status })]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, id, status });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "रिकॉर्ड अपडेट नहीं हुआ। कृपया दोबारा जाँचें।" }, { status: 403 });
  } finally { client.release(); }
}
