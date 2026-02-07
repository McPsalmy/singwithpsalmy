import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET(
  _req: Request,
  context: { params: any }
) {
  // Next.js 16 sometimes provides params as a Promise
  const p = context?.params;
  const resolved = typeof p?.then === "function" ? await p : p;

  const id = String(resolved?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tracks")
    .select("id,title,slug,price_naira,downloads,is_active,created_at")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
