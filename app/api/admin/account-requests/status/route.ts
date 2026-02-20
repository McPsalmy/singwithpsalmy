import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  status?: "open" | "processed" | "archived" | string;
  notes?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    const id = String(body?.id ?? "").trim();
    const notesRaw = String(body?.notes ?? "").trim();

    const status =
      body?.status === "processed"
        ? "processed"
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
      status === "processed"
        ? {
            status: "processed",
            processed_at: nowIso,
            processed_notes: notesRaw ? notesRaw.slice(0, 2000) : null,
          }
        : status === "archived"
        ? {
            status: "archived",
            processed_notes: notesRaw ? notesRaw.slice(0, 2000) : null,
          }
        : {
            status: "open",
            processed_at: null,
            processed_notes: notesRaw ? notesRaw.slice(0, 2000) : null,
          };

    const { error } = await supabaseAdmin()
      .from("account_delete_requests")
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