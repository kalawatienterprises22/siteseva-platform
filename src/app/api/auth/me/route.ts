import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({ authenticated: true, user }, {
    headers: { "Cache-Control": "no-store" },
  });
}
