import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const bucket = "media";

    // Find the exact cover filename (no guessing extension)
    const { data: list, error: listErr } = await supabase.storage
      .from(bucket)
      .list("covers", { limit: 1000 });

    if (listErr) {
      return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
    }

    const match = (list ?? []).find((x) => x.name.startsWith(`${slug}.`));
    if (!match?.name) {
      return NextResponse.json({ ok: false, error: "Cover not found" }, { status: 404 });
    }

    const path = `covers/${match.name}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 30);

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
