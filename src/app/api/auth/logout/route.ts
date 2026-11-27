import { NextRequest, NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await revokeCurrentSession();
    return NextResponse.redirect(new URL("/login?loggedOut=1", request.url), {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.redirect(new URL("/login?logoutError=1", request.url), {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
