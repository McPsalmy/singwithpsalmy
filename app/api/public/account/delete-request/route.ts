import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Body = {
  reason?: string;
};

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || "";
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing Authorization token" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Verify who is making the request (must be logged in)
    const admin = supabaseAdmin();
    const { data: userData, error: userErr } = await admin.auth.getUser(token);

    if (userErr || !userData?.user?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const email = userData.user.email;

    const body = (await req.json().catch(() => null)) as Body | null;
    const reason = String(body?.reason ?? "").trim().slice(0, 1000);

    const { error: insErr } = await admin.from("account_delete_requests").insert({
      email,
      reason: reason || null,
      status: "open",
    });

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: insErr.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}