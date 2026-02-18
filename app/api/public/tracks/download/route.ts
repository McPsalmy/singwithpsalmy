import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function normalizeVersion(v: unknown) {
  const val = Array.isArray(v) ? v[0] : v;
  if (val === "full-guide" || val === "instrumental" || val === "low-guide") return val;
  return "instrumental";
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
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

    // Collect any cookie changes Supabase Auth wants to make (session refresh)
    const pendingCookies: Array<{ name: string; value: string; options: any }> = [];
    const pendingRemovals: Array<{ name: string; options: any }> = [];

    // 1) Require a logged-in Supabase user
    let email = "";
    try {
      const supaAuth = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            pendingCookies.push({ name, value, options });
          },
          remove(name, options) {
            pendingRemovals.push({ name, options });
          },
        },
      });

      const { data } = await supaAuth.auth.getUser();
      email = (data?.user?.email || "").trim().toLowerCase();
    } catch {
      // ignore
    }

    if (!email) {
      const res = NextResponse.json(
        { ok: false, error: "Unauthorized (please log in)" },
        { status: 401 }
      );

      for (const c of pendingCookies) {
        res.cookies.set({ name: c.name, value: c.value, ...c.options });
      }
      for (const r of pendingRemovals) {
        res.cookies.set({ name: r.name, value: "", ...r.options, maxAge: 0 });
      }

      return res;
    }

    // 2) Check active membership in DB (server-side)
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: rows, error: memErr } = await admin
      .from("memberships")
      .select("expires_at,status,plan")
      .eq("email", email)
      .order("expires_at", { ascending: false })
      .limit(1);

    if (memErr) {
      return NextResponse.json({ ok: false, error: memErr.message }, { status: 500 });
    }

    const row = rows?.[0];
    const expiresAtMs = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
    const isActive = row?.status === "active" && expiresAtMs > Date.now();

    if (!isActive) {
      const res = NextResponse.json(
        { ok: false, error: "Membership inactive or expired" },
        { status: 403 }
      );

      for (const c of pendingCookies) {
        res.cookies.set({ name: c.name, value: c.value, ...c.options });
      }
      for (const r of pendingRemovals) {
        res.cookies.set({ name: r.name, value: "", ...r.options, maxAge: 0 });
      }

      // Clear legacy member cookies
      res.cookies.set("swp_member", "", { path: "/", maxAge: 0 });
      res.cookies.set("swp_member_email", "", { path: "/", maxAge: 0 });

      return res;
    }

    // 3) Create signed URL and stream to force download
    const bucket = "media";
    const path = `full/${slug}-${v}-full.mp4`;

    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Could not create signed URL" },
        { status: 500 }
      );
    }

    const upstream = await fetch(data.signedUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { ok: false, error: `Upstream fetch failed (HTTP ${upstream.status})` },
        { status: 502 }
      );
    }

    const filename = `${slug}-${v}-full.mp4`;

    const baseHeaders = new Headers({
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    });

    // NextResponse so we can set cookies
    const finalRes = new NextResponse(upstream.body, { headers: baseHeaders });

    // Apply auth cookie updates (session refresh)
    for (const c of pendingCookies) {
      finalRes.cookies.set({ name: c.name, value: c.value, ...c.options });
    }
    for (const r of pendingRemovals) {
      finalRes.cookies.set({ name: r.name, value: "", ...r.options, maxAge: 0 });
    }

    // Keep legacy cookies in sync for compatibility (typed sameSite)
    finalRes.cookies.set("swp_member", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      maxAge: 60 * 60 * 24 * 30,
    });

    finalRes.cookies.set("swp_member_email", email, {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      maxAge: 60 * 60 * 24 * 30,
    });

    return finalRes;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
