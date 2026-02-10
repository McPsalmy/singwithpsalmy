import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function normalizeVersion(v: unknown) {
  const val = Array.isArray(v) ? v[0] : v;
  if (val === "full-guide" || val === "instrumental" || val === "low-guide") return val;
  return "instrumental";
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
    const v = normalizeVersion(url.searchParams.get("v"));

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const bucket = "media";
    const path = `full/${slug}-${v}-full.mp4`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10); // 10 minutes

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Could not create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, path, url: data.signedUrl });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
