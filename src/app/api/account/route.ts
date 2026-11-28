import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "लॉगिन जरूरी है।" }, { status: 401 });
  if (!user.roles.includes("DRIVER")) return NextResponse.json({ error: "यह सुविधा Driver खाते के लिए है।" }, { status: 403 });
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id',$1,true)", [user.id]);
    await client.query("SELECT set_config('app.is_super_admin','false',true)");
    const account = await client.query(
      "SELECT display_name,email,mobile_e164,preferred_language,created_at FROM app_users WHERE id=$1",
      [user.id],
    );
    const profile = await client.query(
      "SELECT full_name,phone,experience_years,skills,service_area,verification_status,emergency_contact,driving_license_number,driving_license_expiry,preferred_language,voice_assistance_enabled FROM worker_profiles WHERE user_id=$1",
      [user.id],
    );
    await client.query("COMMIT");
    return NextResponse.json({ account: account.rows[0] ?? null, profile: profile.rows[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "अकाउंट की जानकारी अभी नहीं मिल सकी।" }, { status: 503 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "लॉगिन जरूरी है।" }, { status: 401 });
  if (!user.roles.includes("DRIVER")) return NextResponse.json({ error: "यह सुविधा Driver खाते के लिए है।" }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "जानकारी सही प्रारूप में भेजें।" }, { status: 400 }); }

  const fullName = String(body.fullName ?? "").trim().slice(0, 120);
  const phone = String(body.phone ?? "").trim().slice(0, 20);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254) || null;
  const serviceArea = String(body.serviceArea ?? "").trim().slice(0, 180) || null;
  const emergencyContact = String(body.emergencyContact ?? "").trim().slice(0, 30) || null;
  const licenseNumber = String(body.licenseNumber ?? "").trim().toUpperCase().slice(0, 40) || null;
  const licenseExpiry = String(body.licenseExpiry ?? "").trim() || null;
  const language = body.language === "en" ? "en" : "hi";
  const experience = body.experienceYears === "" || body.experienceYears == null ? null : Number(body.experienceYears);
  const skills = Array.isArray(body.skills) ? body.skills.map((v) => String(v).trim().slice(0, 60)).filter(Boolean).slice(0, 20) : [];

  if (!fullName || !phone) return NextResponse.json({ error: "नाम और मोबाइल नंबर जरूरी हैं।" }, { status: 400 });
  if (experience !== null && (!Number.isFinite(experience) || experience < 0 || experience > 80)) return NextResponse.json({ error: "अनुभव 0 से 80 वर्ष के बीच होना चाहिए।" }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "ईमेल सही दर्ज करें।" }, { status: 400 });
  if (licenseExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiry)) return NextResponse.json({ error: "लाइसेंस की समाप्ति तारीख सही दर्ज करें।" }, { status: 400 });

  const oldPassword = String(body.oldPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if ((oldPassword || newPassword) && (!oldPassword || newPassword.length < 8 || newPassword.length > 128)) {
    return NextResponse.json({ error: "पासवर्ड बदलने के लिए पुराना पासवर्ड और कम-से-कम 8 अक्षरों का नया पासवर्ड डालें।" }, { status: 400 });
  }

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id',$1,true)", [user.id]);
    await client.query("SELECT set_config('app.is_super_admin','false',true)");
    if (oldPassword && newPassword) {
      const current = await client.query("SELECT password_hash FROM app_users WHERE id=$1 FOR UPDATE", [user.id]);
      if (!current.rows[0] || !(await bcrypt.compare(oldPassword, current.rows[0].password_hash))) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "पुराना पासवर्ड सही नहीं है।" }, { status: 400 });
      }
      const hash = await bcrypt.hash(newPassword, 12);
      await client.query("UPDATE app_users SET password_hash=$2,password_changed_at=now(),updated_at=now() WHERE id=$1", [user.id, hash]);
      await client.query("UPDATE app_sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL", [user.id, user.sessionId]);
    }
    await client.query(
      "UPDATE app_users SET display_name=$2,email=$3,preferred_language=$4,updated_at=now() WHERE id=$1",
      [user.id, fullName, email, language],
    );
    await client.query(
      `INSERT INTO worker_profiles
        (user_id,worker_type,full_name,phone,experience_years,skills,service_area,verification_status,emergency_contact,driving_license_number,driving_license_expiry,preferred_language)
       VALUES ($1,'DRIVER',$2,$3,$4,$5,$6,'PENDING',$7,$8,$9,$10)
       ON CONFLICT (user_id) DO UPDATE SET
        full_name=EXCLUDED.full_name,phone=EXCLUDED.phone,experience_years=EXCLUDED.experience_years,
        skills=EXCLUDED.skills,service_area=EXCLUDED.service_area,emergency_contact=EXCLUDED.emergency_contact,
        driving_license_number=EXCLUDED.driving_license_number,driving_license_expiry=EXCLUDED.driving_license_expiry,
        preferred_language=EXCLUDED.preferred_language,updated_at=now()`,
      [user.id, fullName, phone, experience, skills, serviceArea, emergencyContact, licenseNumber, licenseExpiry, language],
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, message: "आपकी अकाउंट जानकारी सेव हो गई है।" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "जानकारी सेव नहीं हो सकी। दोबारा कोशिश करें।" }, { status: 503 });
  } finally {
    client.release();
  }
}
