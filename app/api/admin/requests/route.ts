import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("song_requests")
      .select("id,email,song_title,artist,notes,status,created_at,fulfilled_at,archived_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e: any) {
    // This catches cases where supabaseAdmin() or something else throws
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
