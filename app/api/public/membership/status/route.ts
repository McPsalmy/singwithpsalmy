import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
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

    // We'll build the response at the end so we can safely set/clear cookies.
    const res = NextResponse.json({ ok: true });

    // 1) Try Supabase Auth session first (logged-in users)
    let email = "";
    try {
      const supaAuth = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name, options) {
            res.cookies.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      });

      const { data } = await supaAuth.auth.getUser();
      email = (data?.user?.email || "").trim().toLowerCase();
    } catch {
      // ignore auth errors and fall back to membership cookies
    }

    // 2) Fallback to existing membership cookies (legacy path)
    if (!email) {
      const memberFlag = cookieStore.get("swp_member")?.value === "1";
      const cookieEmail = (cookieStore.get("swp_member_email")?.value || "")
        .trim()
        .toLowerCase();

      if (memberFlag && cookieEmail) {
        email = cookieEmail;
      }
    }

    // If we still don't have an email, user is not logged in / not a member
    if (!email) {
      return NextResponse.json({ ok: true, isMember: false });
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
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const row = data?.[0];
    const expiresAtMs = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
    const isActive = row?.status === "active" && expiresAtMs > Date.now();

    // Build final response payload
    const payload = {
      ok: true,
      isMember: isActive,
      email,
      expires_at: row?.expires_at ?? null,
      plan: row?.plan ?? null,
    };

    // Return payload and keep legacy cookies in sync
    const finalRes = NextResponse.json(payload);

    if (isActive) {
      // Set cookies for compatibility with existing member flow
      finalRes.cookies.set("swp_member", "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      finalRes.cookies.set("swp_member_email", email, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      // Not active -> clear member cookies
      finalRes.cookies.set("swp_member", "", { path: "/", maxAge: 0 });
      finalRes.cookies.set("swp_member_email", "", { path: "/", maxAge: 0 });
    }

    return finalRes;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
