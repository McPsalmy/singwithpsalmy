import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase env vars" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference || "").trim();

    if (!reference) {
      return NextResponse.json(
        { ok: false, error: "Missing reference" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Find the membership payment
    const { data: mpRows, error: mpErr } = await supabase
      .from("membership_payments")
      .select("email,status,paid_at")
      .eq("paystack_reference", reference)
      .limit(1);

    if (mpErr) {
      return NextResponse.json(
        { ok: false, error: mpErr.message || "Could not load membership payment" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const mp = mpRows?.[0];
    if (!mp) {
      return NextResponse.json(
        { ok: false, error: "Reference not found in membership_payments" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const email = String(mp.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Missing email on membership payment row" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2) Mark this payment as refunded (idempotent)
    const { error: updErr } = await supabase
      .from("membership_payments")
      .update({ status: "refunded" })
      .eq("paystack_reference", reference);

    if (updErr) {
      return NextResponse.json(
        { ok: false, error: updErr.message || "Could not mark refunded" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3) Pull all remaining SUCCESS payments for this email
    const { data: payments, error: listErr } = await supabase
      .from("membership_payments")
      .select("months,paid_at,plan,status")
      .eq("email", email)
      .neq("status", "refunded")
      .order("paid_at", { ascending: true });

    if (listErr) {
      return NextResponse.json(
        { ok: false, error: listErr.message || "Could not list membership payments" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // If no remaining successful payments -> expire membership (UPSERT)
    if (!payments || payments.length === 0) {
      const { data: saved, error: upErr } = await supabase
        .from("memberships")
        .upsert(
          {
            email,
            status: "expired",
            plan: null,
            expires_at: null,
          },
          { onConflict: "email" }
        )
        .select("email,status,plan,started_at,expires_at")
        .single();

      if (upErr) {
        return NextResponse.json(
          { ok: false, error: upErr.message || "Could not expire membership" },
          { status: 500, headers: { "Cache-Control": "no-store" } }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          email: saved.email,
          status: saved.status,
          expires_at: saved.expires_at,
          remaining_payments: 0,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4) Recompute expiry: extend from max(current_expiry, payment_date)
    let cursor: Date | null = null;

    for (const p of payments) {
      const months = Number((p as any).months || 0);
      const paidAt = (p as any).paid_at ? new Date((p as any).paid_at) : new Date();

      if (!cursor) cursor = paidAt;
      if (paidAt.getTime() > cursor.getTime()) cursor = paidAt; // restart on gaps

      if (months > 0) cursor = addMonths(cursor, months);
    }

    const newExpiry = (cursor ?? new Date()).toISOString();
    const latestPlan = String((payments[payments.length - 1] as any)?.plan || "unknown");

    // 5) Write derived membership row (UPSERT) and return what was actually saved
    const { data: saved, error: upErr } = await supabase
      .from("memberships")
      .upsert(
        {
          email,
          status: "active",
          plan: latestPlan,
          expires_at: newExpiry,
        },
        { onConflict: "email" }
      )
      .select("email,status,plan,started_at,expires_at")
      .single();

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: upErr.message || "Could not update membership expiry" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        email: saved.email,
        status: saved.status,
        expires_at: saved.expires_at,
        remaining_payments: payments.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
