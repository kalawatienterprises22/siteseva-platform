import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ pendingId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) });
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin"), host = request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "अनुमति नहीं है।" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Authenticator ऐप का 6 अंकों का कोड डालें।" }, { status: 400 });
  const client = await getDb().connect();
  let stage = "TRANSACTION_START";
  try {
    await client.query("BEGIN");
    stage = "BOOTSTRAP_STATE_READ";
    const state = await client.query<{ completed: boolean }>("SELECT completed FROM app_bootstrap_state WHERE id=true FOR UPDATE");
    if (!state.rows[0] || state.rows[0].completed) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "पहला Admin सेटअप पहले ही पूरा हो चुका है।" }, { status: 409 });
    }
    stage = "PENDING_SETUP_READ";
    const pending = await client.query<{
      mobile_e164: string; display_name: string; password_hash: string;
      mfa_secret_ciphertext: string; mfa_secret_iv: string; mfa_secret_tag: string;
    }>(
      "SELECT mobile_e164,display_name,password_hash,mfa_secret_ciphertext,mfa_secret_iv,mfa_secret_tag FROM app_admin_bootstrap_pending WHERE id=$1 AND expires_at>now() FOR UPDATE",
      [parsed.data.pendingId],
    );
    const row = pending.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "सेटअप की अवधि समाप्त हो गई है। दोबारा शुरू करें।" }, { status: 410 });
    }
    stage = "TOTP_SECRET_DECRYPT";
    const secret = decryptTotpSecret(row.mfa_secret_ciphertext, row.mfa_secret_iv, row.mfa_secret_tag);
    stage = "TOTP_CODE_VERIFY";
    if (!verifyTotpCode(secret, parsed.data.code)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Authenticator कोड सही नहीं है। फोन का समय Automatic रखें।" }, { status: 401 });
    }
    stage = "COMPANY_AND_ROLE_LOOKUP";
    const userId = randomUUID();
    const organization = await client.query<{ id: string }>(
      "SELECT id FROM app_organizations WHERE organization_type='COMPANY' AND status='ACTIVE' ORDER BY created_at LIMIT 1",
    );
    const role = await client.query<{ id: string }>("SELECT id FROM app_roles WHERE role_key='SUPER_ADMIN' LIMIT 1");
    if (!organization.rows[0] || !role.rows[0]) throw new Error("Company organization or role is missing");
    stage = "RLS_CONTEXT_SETUP";
    await client.query("SELECT set_config('app.user_id',$1,true)", [userId]);
    await client.query("SELECT set_config('app.is_super_admin','true',true)");
    stage = "ADMIN_USER_INSERT";
    await client.query(
      `INSERT INTO app_users
        (id,mobile_e164,display_name,password_hash,status,mfa_enabled,mfa_secret_ciphertext,mfa_secret_iv,mfa_secret_tag,mfa_enrolled_at)
       VALUES ($1,$2,$3,$4,'ACTIVE',true,$5,$6,$7,now())`,
      [userId,row.mobile_e164,row.display_name,row.password_hash,row.mfa_secret_ciphertext,row.mfa_secret_iv,row.mfa_secret_tag],
    );
    stage = "COMPANY_MEMBERSHIP_INSERT";
    await client.query(
      "INSERT INTO app_org_memberships(organization_id,user_id,membership_status) VALUES($1,$2,'ACTIVE')",
      [organization.rows[0].id,userId],
    );
    stage = "SUPER_ADMIN_ROLE_INSERT";
    await client.query(
      "INSERT INTO app_user_roles(user_id,role_id,organization_id,granted_by) VALUES($1,$2,$3,NULL)",
      [userId,role.rows[0].id,organization.rows[0].id],
    );
    stage = "AUDIT_LOG_INSERT";
    await client.query(
      `INSERT INTO app_audit_logs(actor_user_id,actor_role_key,action,target_type,target_id,outcome,details)
       VALUES($1,'SUPER_ADMIN','FIRST_SUPER_ADMIN_BOOTSTRAPPED','USER',$1::text,'SUCCESS','{"mfa":"TOTP"}'::jsonb)`,
      [userId],
    );
    stage = "BOOTSTRAP_FINALIZE";
    await client.query("UPDATE app_bootstrap_state SET completed=true,completed_at=now() WHERE id=true");
    stage = "PENDING_SETUP_CLEANUP";
    await client.query("DELETE FROM app_admin_bootstrap_pending");
    stage = "TRANSACTION_COMMIT";
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, message: "Company Super Admin तैयार है। अब अलग Super Admin लॉगिन करें।", redirectTo: "/super-admin/login" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const dbError = error as { code?: string; constraint?: string };
    console.error("SiteSeva first-admin bootstrap transaction failed", {
      stage,
      databaseCode: dbError?.code ?? "UNKNOWN",
      constraint: dbError?.constraint ?? null,
    });
    try { await client.query("ROLLBACK"); } catch (rollbackError) {
      console.error("SiteSeva bootstrap rollback failed", rollbackError);
    }
    const stageLabels: Record<string, string> = {
      TRANSACTION_START: "डेटाबेस कनेक्शन", BOOTSTRAP_STATE_READ: "पहले Admin की स्थिति जाँच",
      PENDING_SETUP_READ: "Pending Setup पढ़ना", TOTP_SECRET_DECRYPT: "Authenticator Secret खोलना",
      TOTP_CODE_VERIFY: "Authenticator OTP सत्यापन", COMPANY_AND_ROLE_LOOKUP: "Company और Admin Role जाँच",
      RLS_CONTEXT_SETUP: "सुरक्षा अनुमति सेट करना", ADMIN_USER_INSERT: "Admin अकाउंट बनाना",
      COMPANY_MEMBERSHIP_INSERT: "Company Membership बनाना", SUPER_ADMIN_ROLE_INSERT: "Super Admin Role देना",
      AUDIT_LOG_INSERT: "सुरक्षा Audit Log लिखना", BOOTSTRAP_FINALIZE: "Setup पूरा दर्ज करना",
      PENDING_SETUP_CLEANUP: "अस्थायी Setup रिकॉर्ड हटाना", TRANSACTION_COMMIT: "Database Transaction सुरक्षित करना",
    };
    return NextResponse.json({
      error: `पहला Admin सुरक्षित रूप से नहीं बन सका। विफल चरण: ${stageLabels[stage] ?? "अज्ञात चरण"}।`,
      reference: `SITESEVA_BOOTSTRAP_${stage}`,
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  } finally {
    client.release();
  }
}
