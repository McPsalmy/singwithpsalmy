import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(req: Request, ctx: any) {
  try {
    // Primary: Next params
    let id = String(ctx?.params?.id || "").trim();

    // Fallback: parse from URL pathname (last segment)
    if (!id) {
      const url = new URL(req.url);
      const parts = url.pathname.split("/").filter(Boolean);
      id = String(parts[parts.length - 1] || "").trim();
    }

    // If still missing or weird, bail
    if (!id || id === "tracks") {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("tracks")
      .select("id,title,slug,price_naira,downloads,is_active,created_at")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
