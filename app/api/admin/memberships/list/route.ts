import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase env vars" },
        { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
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
        { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
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

    // Add a timestamp so you can confirm the response is truly fresh
    const generated_at = new Date().toISOString();
    const url = new URL(req.url);
    const seen_t = url.searchParams.get("t") || null;

    return NextResponse.json(
      {
        ok: true,
        generated_at,
        seen_t,
        counts: { active, expired, total: (data ?? []).length },
        data: data ?? [],
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  }
}
