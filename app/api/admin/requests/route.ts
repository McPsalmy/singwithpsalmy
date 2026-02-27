import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: any, init?: { status?: number }) {
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("song_requests")
      .select("id,email,song_title,artist,notes,status,created_at,fulfilled_at,archived_at")
      .order("created_at", { ascending: false });

    if (error) {
      return noStoreJson({ ok: false, error: error.message }, { status: 500 });
    }

    return noStoreJson({ ok: true, data: data ?? [] });
  } catch (e: any) {
    return noStoreJson(
      { ok: false, error: e?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}