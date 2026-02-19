import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase env vars" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("memberships")
      .select("email,plan,status,started_at,expires_at")
      .order("expires_at", { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const row of data ?? []) {
      const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
      const isActive = row.status === "active" && exp > now;
      if (isActive) active += 1;
      else expired += 1;
    }

    return NextResponse.json(
      {
        ok: true,
        counts: { active, expired, total: (data ?? []).length },
        data: data ?? [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
