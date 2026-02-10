import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_MINUTES = 30;

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
    const reference = String(url.searchParams.get("reference") || "").trim();
    if (!reference) {
      return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("orders")
      .select("paystack_reference,email,amount,currency,items,paid_at,created_at,status")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "Could not load order" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    if (data.status !== "paid") {
      return NextResponse.json(
        { ok: false, error: `Order not paid: ${data.status}` },
        { status: 403 }
      );
    }

    const paidAtIso = data.paid_at || data.created_at;
    const paidAtMs = paidAtIso ? new Date(paidAtIso).getTime() : 0;

    if (!paidAtMs) {
      return NextResponse.json({ ok: false, error: "Missing paid_at timestamp" }, { status: 401 });
    }

    if (Date.now() - paidAtMs > MAX_MINUTES * 60 * 1000) {
      return NextResponse.json(
        { ok: false, error: `Recovery window expired (${MAX_MINUTES} minutes).` },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      reference: data.paystack_reference,
      email: data.email,
      amount: data.amount,
      currency: data.currency,
      items: data.items || [],
      paid_at: data.paid_at,
      created_at: data.created_at,
      window_minutes: MAX_MINUTES,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
