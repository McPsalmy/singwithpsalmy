export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

    const debug = new URL("https://x" + (process.env.VERCEL_URL ? "" : "")).toString(); // ignore, just keeps TS calm

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const host = (() => {
  try { return new URL(url).host; } catch { return ""; }
})();

const showDebug = new URL((globalThis as any).location?.href || "https://dummy").searchParams?.get?.("debug") === "1";
// (Above line may not work server-side reliably; we’ll use req in next step if needed.)

const res = NextResponse.json({
  ok: true,
  data: data ?? [],
  debug: undefined,
});

res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
res.headers.set("Pragma", "no-cache");
res.headers.set("Expires", "0");

return res;


}
