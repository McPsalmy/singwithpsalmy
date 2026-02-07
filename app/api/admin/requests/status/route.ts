import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || "").trim();
    const status = body?.status === "fulfilled" ? "fulfilled" : "open";

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const update =
      status === "fulfilled"
        ? { status: "fulfilled", fulfilled_at: new Date().toISOString() }
        : { status: "open", fulfilled_at: null };

    const { error } = await supabaseAdmin.from("song_requests").update(update).eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
