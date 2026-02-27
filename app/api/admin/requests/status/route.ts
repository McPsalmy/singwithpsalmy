import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  id?: string;
  status?: "open" | "fulfilled" | "archived" | string;
};

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

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const id = String(body?.id ?? "").trim();
    if (!id) return noStoreJson({ ok: false, error: "Missing id" }, { status: 400 });

    const status =
      body?.status === "fulfilled"
        ? "fulfilled"
        : body?.status === "archived"
        ? "archived"
        : "open";

    const nowIso = new Date().toISOString();

    const update =
      status === "fulfilled"
        ? { status: "fulfilled", fulfilled_at: nowIso, archived_at: null }
        : status === "archived"
        ? { status: "archived", archived_at: nowIso }
        : { status: "open", fulfilled_at: null, archived_at: null };

    // ✅ Return the updated row so the UI can update immediately without waiting for reload.
    const { data, error } = await supabaseAdmin()
      .from("song_requests")
      .update(update)
      .eq("id", id)
      .select("id,email,song_title,artist,notes,status,created_at,fulfilled_at,archived_at")
      .single();

    if (error) {
      return noStoreJson({ ok: false, error: error.message }, { status: 500 });
    }

    return noStoreJson({ ok: true, data });
  } catch (e: any) {
    return noStoreJson(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}