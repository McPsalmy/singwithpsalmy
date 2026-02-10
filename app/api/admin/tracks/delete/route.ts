import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VersionKey = "full-guide" | "instrumental" | "low-guide";
const versions: VersionKey[] = ["full-guide", "instrumental", "low-guide"];

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase env vars" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const slug = String(body?.slug || "").trim();

    if (!id || !slug) {
      return NextResponse.json(
        { ok: false, error: "Missing id or slug" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const bucket = "media";

    // Build storage paths to delete
    const toRemove: string[] = [];

    // Cover: could be multiple ext; delete any matching slug.*
    // We'll list covers and remove matches (case-insensitive)
    const { data: covers, error: coversErr } = await supabase.storage
      .from(bucket)
      .list("covers", { limit: 1000 });

    if (coversErr) {
      return NextResponse.json(
        { ok: false, error: coversErr.message || "Could not list covers" },
        { status: 500 }
      );
    }

    const slugLower = slug.toLowerCase();
    (covers ?? []).forEach((x) => {
      const name = (x.name || "").toLowerCase();
      if (name.startsWith(`${slugLower}.`)) {
        toRemove.push(`covers/${x.name}`);
      }
    });

    // Previews + full videos (fixed names)
    for (const v of versions) {
      toRemove.push(`previews/${slug}-${v}-preview_web.mp4`);
      toRemove.push(`full/${slug}-${v}-full.mp4`);
    }

    // Remove storage objects (Supabase remove is "best effort"—we still continue)
    // Note: remove expects paths relative to bucket root
    const { error: removeErr } = await supabase.storage.from(bucket).remove(toRemove);
    // If some files weren't present, Supabase may still succeed; if it errors, report it.
    if (removeErr) {
      return NextResponse.json(
        { ok: false, error: removeErr.message || "Could not remove files" },
        { status: 500 }
      );
    }

    // Delete DB row
    const { error: dbErr } = await supabase.from("tracks").delete().eq("id", id);
    if (dbErr) {
      return NextResponse.json(
        { ok: false, error: dbErr.message || "Could not delete track row" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, removed: toRemove.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
