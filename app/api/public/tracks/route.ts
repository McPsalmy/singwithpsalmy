export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { supabaseClient } from "../../../lib/supabaseClient";

export async function GET() {
  const supabase = supabaseClient();

  const { data, error } = await supabase
    .from("tracks")
    .select("id,title,slug,price_naira,downloads,is_active,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}
