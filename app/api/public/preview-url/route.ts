import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VersionKey = "full-guide" | "instrumental" | "low-guide";

function isVersion(v: any): v is VersionKey {
  return v === "full-guide" || v === "instrumental" || v === "low-guide";
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase env vars" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const slug = String(url.searchParams.get("slug") || "").trim();
    const v = String(url.searchParams.get("v") || "").trim();

    if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    if (!isVersion(v)) return NextResponse.json({ ok: false, error: "Invalid version" }, { status: 400 });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const bucket = "media";
    const path = `previews/${slug}-${v}-preview_web.mp4`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 30); // 30 minutes

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Could not create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, url: data.signedUrl, path });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
