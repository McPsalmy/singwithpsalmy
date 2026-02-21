export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseClient } from "../../../lib/supabaseClient";

export const revalidate = 0;

export async function GET(req: Request) {
  const supabase = supabaseClient();

  // Run the exact same query, but also request an exact count
  const { data, error, count } = await supabase
    .from("tracks")
    .select("id,title,slug,price_naira,downloads,is_active,created_at", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let supabaseHost = "";
  try {
    supabaseHost = new URL(url).host;
  } catch {}

  const showDebug = new URL(req.url).searchParams.get("debug") === "1";

  const res = NextResponse.json({
    ok: !error,
    data: data ?? [],
    ...(showDebug
      ? {
          debug: {
            supabaseHost,
            count,
            error: error
              ? { message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code }
              : null,
          },
        }
      : {}),
    ...(error ? { error: error.message } : {}),
  });

  res.headers.set("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}