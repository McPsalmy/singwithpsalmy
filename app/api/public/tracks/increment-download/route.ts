import { createClient } from "@supabase/supabase-js";
import { getClientIp, noStoreJson, rateLimit } from "../../../../lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return noStoreJson({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    // ✅ Light rate limit (prevents bots spamming download counter)
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `dl_inc:${ip}`, limit: 120, windowMs: 10 * 60 * 1000 }); // 120 / 10min / IP
    if (!rl.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug || "").trim();
    if (!slug) {
      return noStoreJson({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    // Prevent double-counting on refresh (per device/browser) for a while
    const cookieName = `swp_dl_${slug}`;
    const cookieHeader = req.headers.get("cookie") || "";
    if (cookieHeader.includes(`${cookieName}=1`)) {
      return noStoreJson({ ok: true, skipped: true });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Read current downloads
    const { data, error: readErr } = await supabase
      .from("tracks")
      .select("downloads")
      .eq("slug", slug)
      .maybeSingle();

    if (readErr) {
      return noStoreJson({ ok: false, error: readErr.message }, { status: 500 });
    }
    if (!data) {
      return noStoreJson({ ok: false, error: "Track not found" }, { status: 404 });
    }

    const next = Number(data.downloads || 0) + 1;

    const { error: upErr } = await supabase.from("tracks").update({ downloads: next }).eq("slug", slug);

    if (upErr) {
      return noStoreJson({ ok: false, error: upErr.message }, { status: 500 });
    }

    const res = noStoreJson({ ok: true, downloads: next });

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
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}