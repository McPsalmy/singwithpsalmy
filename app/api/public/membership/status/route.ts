import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const store = await cookies();
    const memberFlag = store.get("swp_member")?.value === "1";
    const email = store.get("swp_member_email")?.value || "";

    if (!memberFlag || !email) {
      return NextResponse.json({ ok: true, isMember: false });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase env vars" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("memberships")
      .select("expires_at,status,plan")
      .eq("email", email)
      .eq("status", "active")
      .order("expires_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const row = data?.[0];
    const expiresAt = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
    const isActive = expiresAt > Date.now();

    return NextResponse.json({
      ok: true,
      isMember: isActive,
      email,
      expires_at: row?.expires_at ?? null,
      plan: row?.plan ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
