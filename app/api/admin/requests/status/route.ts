import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  status?: "open" | "fulfilled" | "archived" | string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const id = String(body?.id ?? "").trim();

    const status =
      body?.status === "fulfilled"
        ? "fulfilled"
        : body?.status === "archived"
        ? "archived"
        : "open";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing id" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const nowIso = new Date().toISOString();

    const update =
      status === "fulfilled"
        ? { status: "fulfilled", fulfilled_at: nowIso, archived_at: null }
        : status === "archived"
        ? { status: "archived", archived_at: nowIso }
        : { status: "open", fulfilled_at: null, archived_at: null };

    const { error } = await supabaseAdmin()
      .from("song_requests")
      .update(update)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}