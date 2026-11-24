import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await revokeCurrentSession();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "सत्र बंद नहीं हो सका।" }, { status: 500 });
  }
}
