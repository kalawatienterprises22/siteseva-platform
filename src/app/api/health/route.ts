import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().query("SELECT 1");
    return NextResponse.json({ ok: true, service: "siteseva-platform", database: "connected" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Do not expose database URLs, credentials, or internal exception details.
    return NextResponse.json({ ok: false, service: "siteseva-platform", database: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
