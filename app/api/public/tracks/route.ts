export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseClient } from "../../../lib/supabaseClient";

export async function GET(req: Request) {
  const supabase = supabaseClient();

  const { data, error } = await supabase
    .from("tracks")
    .select("id,title,slug,price_naira,downloads,is_active,created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let supabaseHost = "";
  try {
    supabaseHost = new URL(url).host;
  } catch {}

  const showDebug = new URL(req.url).searchParams.get("debug") === "1";

  const res = NextResponse.json({
    ok: true,
    data: data ?? [],
    ...(showDebug ? { debug: { supabaseHost } } : {}),
  });

  res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}
