import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginWithPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  mobile: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "अनुमति नहीं है।" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "अनुरोध मान्य नहीं है।" }, { status: 400 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "अनुरोध मान्य नहीं है।" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "मोबाइल नंबर + देश कोड के साथ और कम-से-कम 8 अक्षर का पासवर्ड डालें।" },
      { status: 400 },
    );
  }

  try {
    const result = await loginWithPassword(request, { ...parsed.data, portal: "super-admin" });
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
    return NextResponse.json(
      { ok: true, user: result.user, redirectTo: result.redirectTo },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "अभी लॉगिन पूरा नहीं हो सका। कृपया बाद में प्रयास करें।" }, { status: 500 });
  }
}
