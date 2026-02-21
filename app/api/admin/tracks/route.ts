import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("tracks")
    .select("id,title,slug,price_naira,downloads,is_active,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    const res = NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    return res;
  }

  const res = NextResponse.json({ ok: true, data: data ?? [] });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}