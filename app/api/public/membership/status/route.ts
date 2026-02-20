import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

function noStoreJson(payload: any, init?: { status?: number }) {
  const res = NextResponse.json(payload, init);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return noStoreJson({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    // Collect any cookie changes Supabase Auth wants to make (session refresh, etc.)
    const pendingCookies: Array<{ name: string; value: string; options: any }> = [];
    const pendingRemovals: Array<{ name: string; options: any }> = [];

    // ✅ Identity source:
    // 1) Authorization Bearer token (authoritative)
    // 2) Supabase Auth cookies (server session)
    // ❌ No legacy swp_member cookies allowed (prevents sticky member state)
    let email = "";

    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    // 1) Bearer token path
    if (bearer) {
      const tokenClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await tokenClient.auth.getUser(bearer);
      if (!error) {
        email = (data?.user?.email || "").trim().toLowerCase();
      }
    }

    // 2) Supabase Auth cookie session path
    if (!email) {
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
    }

    // If still no email, user is not authenticated -> NOT a member for UI gating.
    if (!email) {
      const res = noStoreJson({ ok: true, isMember: false });

      // Apply any Supabase cookie refresh/removals
      for (const c of pendingCookies) {
        res.cookies.set({ name: c.name, value: c.value, ...c.options });
      }
      for (const r of pendingRemovals) {
        res.cookies.set({ name: r.name, value: "", ...r.options, maxAge: 0 });
      }

      // ✅ Hard clear legacy cookies so the UI never "sticks" after logout
      res.cookies.set("swp_member", "", { path: "/", maxAge: 0 });
      res.cookies.set("swp_member_email", "", { path: "/", maxAge: 0 });

      return res;
    }

    // Service-role client for DB membership lookup
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await admin
      .from("memberships")
      .select("expires_at,status,plan")
      .eq("email", email)
      .order("expires_at", { ascending: false })
      .limit(1);

    if (error) {
      return noStoreJson({ ok: false, error: error.message }, { status: 500 });
    }

    const row = data?.[0];
    const expiresAtMs = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
    const isActive = row?.status === "active" && expiresAtMs > Date.now();

    const payload = {
      ok: true,
      isMember: isActive,
      email,
      expires_at: row?.expires_at ?? null,
      plan: row?.plan ?? null,
    };

    const res = noStoreJson(payload);

    // Apply any Supabase cookie refresh/removals
    for (const c of pendingCookies) {
      res.cookies.set({ name: c.name, value: c.value, ...c.options });
    }
    for (const r of pendingRemovals) {
      res.cookies.set({ name: r.name, value: "", ...r.options, maxAge: 0 });
    }

    // ✅ Always clear legacy cookies (we are officially not using them anymore)
    res.cookies.set("swp_member", "", { path: "/", maxAge: 0 });
    res.cookies.set("swp_member_email", "", { path: "/", maxAge: 0 });

    return res;
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}