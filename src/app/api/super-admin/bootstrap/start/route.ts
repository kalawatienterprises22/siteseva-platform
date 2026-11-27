import { NextRequest, NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { encryptTotpSecret, generateTotpSecret, totpUri } from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({
  bootstrapToken: z.string().min(32).max(256),
  mobile: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
  displayName: z.string().trim().min(2).max(120),
  password: z.string().min(12).max(128),
});
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
function tokenMatches(provided: string, expected: string) {
  const a = Buffer.from(provided), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "अनुमति नहीं है।" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "मोबाइल, नाम और कम-से-कम 12 अक्षर का मजबूत पासवर्ड दें।" }, { status: 400 });
  const expected = process.env.SITESEVA_BOOTSTRAP_TOKEN;
  if (!expected || !tokenMatches(parsed.data.bootstrapToken, expected)) {
    return NextResponse.json({ error: "सेटअप टोकन सही नहीं है।" }, { status: 403 });
  }
  const db = getDb();
  const state = await db.query<{ completed: boolean }>("SELECT completed FROM app_bootstrap_state WHERE id=true");
  if (!state.rows[0] || state.rows[0].completed) return NextResponse.json({ error: "पहला Admin सेटअप पहले ही पूरा हो चुका है।" }, { status: 409 });
  const secret = generateTotpSecret();
  const encrypted = encryptTotpSecret(secret);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const id = randomUUID();
  try {
    await db.query("DELETE FROM app_admin_bootstrap_pending WHERE expires_at <= now()");
    await db.query(
      `INSERT INTO app_admin_bootstrap_pending
        (id,mobile_e164,display_name,password_hash,mfa_secret_ciphertext,mfa_secret_iv,mfa_secret_tag,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,now()+interval '15 minutes')
       ON CONFLICT (mobile_e164) DO UPDATE SET
         id=EXCLUDED.id, display_name=EXCLUDED.display_name, password_hash=EXCLUDED.password_hash,
         mfa_secret_ciphertext=EXCLUDED.mfa_secret_ciphertext, mfa_secret_iv=EXCLUDED.mfa_secret_iv,
         mfa_secret_tag=EXCLUDED.mfa_secret_tag, expires_at=EXCLUDED.expires_at, created_at=now()`,
      [id, parsed.data.mobile, parsed.data.displayName, passwordHash, encrypted.ciphertext, encrypted.iv, encrypted.tag],
    );
    return NextResponse.json({ ok: true, pendingId: id, secret, otpauthUri: totpUri(secret, parsed.data.mobile), expiresInMinutes: 15 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "सेटअप शुरू नहीं हो सका।" }, { status: 503 });
  }
}
