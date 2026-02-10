import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const slug = String(body?.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    // Prevent double-counting on refresh (per device/browser) for a while
    const cookieName = `swp_dl_${slug}`;
    const cookieHeader = req.headers.get("cookie") || "";
    if (cookieHeader.includes(`${cookieName}=1`)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Get current downloads
    const { data, error: readErr } = await supabase
      .from("tracks")
      .select("downloads")
      .eq("slug", slug)
      .maybeSingle();

    if (readErr) {
      return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "Track not found" }, { status: 404 });
    }

    const next = Number(data.downloads || 0) + 1;

    // Update downloads (simple approach)
    const { error: upErr } = await supabase
      .from("tracks")
      .update({ downloads: next })
      .eq("slug", slug);

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, downloads: next });

    // Set anti-refresh cookie (12 hours)
    res.cookies.set(cookieName, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
