import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function jsonNoStore(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

async function getEmailFromBearer(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { ok: false as const, error: "Unauthorized" };

  const tokenClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await tokenClient.auth.getUser(token);
  if (error || !data?.user?.email) {
    return { ok: false as const, error: "Invalid session" };
  }

  return { ok: true as const, email: data.user.email.trim().toLowerCase() };
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonNoStore({ ok: false, error: "Missing Supabase env vars" }, 500);
    }

    const who = await getEmailFromBearer(req);
    if (!who.ok) return jsonNoStore({ ok: false, error: who.error }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Only what dashboard needs: reference, amount, currency, items, paid_at
    const { data, error } = await admin
      .from("orders")
      .select("paystack_reference,amount,currency,items,paid_at")
      .eq("email", who.email)
      .order("paid_at", { ascending: false });

    if (error) {
      return jsonNoStore({ ok: false, error: error.message }, 500);
    }

    return jsonNoStore({ ok: true, email: who.email, data: data ?? [] });
  } catch (e: any) {
    return jsonNoStore({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

// Customer-controlled history cleanup (only their own)
export async function DELETE(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonNoStore({ ok: false, error: "Missing Supabase env vars" }, 500);
    }

    const who = await getEmailFromBearer(req);
    if (!who.ok) return jsonNoStore({ ok: false, error: who.error }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Hard delete ONLY this user's orders
    const { error } = await admin.from("orders").delete().eq("email", who.email);

    if (error) {
      return jsonNoStore({ ok: false, error: error.message }, 500);
    }

    return jsonNoStore({ ok: true, cleared: true });
  } catch (e: any) {
    return jsonNoStore({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}