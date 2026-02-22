import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { noStoreJson } from "../../../../lib/security";

export const dynamic = "force-dynamic";

function getAdminCookie(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  // swp_admin=1 (or any value) means authenticated by your middleware flow
  const m = cookie.match(/(?:^|;\s*)swp_admin=([^;]+)/);
  return m?.[1] || "";
}

type Body = {
  requestId: string; // account_delete_requests.id (uuid/int depending on your table)
};

export async function POST(req: Request) {
  try {
    // ✅ Admin gate (same style as your other /api/admin routes)
    const adminCookie = getAdminCookie(req);
    if (!adminCookie) {
      return noStoreJson({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const requestId = String(body?.requestId || "").trim();

    if (!requestId) {
      return noStoreJson({ ok: false, error: "Missing requestId" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1) Load the delete request
    const { data: reqRow, error: reqErr } = await admin
      .from("account_delete_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr) {
      return noStoreJson({ ok: false, error: reqErr.message }, { status: 500 });
    }
    if (!reqRow) {
      return noStoreJson({ ok: false, error: "Request not found" }, { status: 404 });
    }
    if (reqRow.status && String(reqRow.status).toLowerCase() !== "open") {
      return noStoreJson({ ok: false, error: "Request already processed" }, { status: 409 });
    }

    const email = String(reqRow.email || "").trim().toLowerCase();
    if (!email) {
      return noStoreJson({ ok: false, error: "Request has no email" }, { status: 400 });
    }

    // 2) Find the auth user by email (Supabase Admin API)
    // Note: requires service role key.
    const { data: users, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 2000,
    });

    if (listErr) {
      return noStoreJson({ ok: false, error: listErr.message }, { status: 500 });
    }

    const match = (users?.users || []).find(
      (u) => (u.email || "").toLowerCase() === email
    );

    // 3) Delete auth user if found (this removes login access)
    if (match?.id) {
      const { error: delErr } = await admin.auth.admin.deleteUser(match.id);
      if (delErr) {
        return noStoreJson({ ok: false, error: delErr.message }, { status: 500 });
      }
    }

    // 4) Mark request as approved/deleted
    const { error: updErr } = await admin
      .from("account_delete_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updErr) {
      return noStoreJson({ ok: false, error: updErr.message }, { status: 500 });
    }

    // 5) Trigger email via your existing notify route (if you have one),
    // OR do it directly later. For now, we return ok.
    return noStoreJson({ ok: true, deletedAuthUser: !!match?.id });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown server error" }, { status: 500 });
  }
}