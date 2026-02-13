import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

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
    const reference = String(body?.reference || "").trim();

    if (!reference) {
      return NextResponse.json(
        { ok: false, error: "Missing reference" },
        { status: 400 }
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
        { status: 500 }
      );
    }

    const mp = mpRows?.[0];
    if (!mp) {
      return NextResponse.json(
        { ok: false, error: "Reference not found in membership_payments" },
        { status: 404 }
      );
    }

    const email = String(mp.email || "").trim();
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Missing email on membership payment row" },
        { status: 500 }
      );
    }

    // 2) Mark as refunded (idempotent)
    const { error: updErr } = await supabase
      .from("membership_payments")
      .update({ status: "refunded" })
      .eq("paystack_reference", reference);

    if (updErr) {
      return NextResponse.json(
        { ok: false, error: updErr.message || "Could not mark refunded" },
        { status: 500 }
      );
    }

    // 3) Recompute membership expiry from ALL non-refunded membership payments
    const { data: payments, error: listErr } = await supabase
      .from("membership_payments")
      .select("months,paid_at,plan,status")
      .eq("email", email)
      .neq("status", "refunded")
      .order("paid_at", { ascending: true });

    if (listErr) {
      return NextResponse.json(
        { ok: false, error: listErr.message || "Could not list membership payments" },
        { status: 500 }
      );
    }

    // If no remaining successful payments, expire membership
    if (!payments || payments.length === 0) {
      const { error: memUpdErr } = await supabase
        .from("memberships")
        .update({
          status: "expired",
          expires_at: new Date(0).toISOString(),
        })
        .eq("email", email);

      if (memUpdErr) {
        return NextResponse.json(
          { ok: false, error: memUpdErr.message || "Could not expire membership" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        email,
        status: "expired",
        expires_at: null,
        remaining_payments: 0,
      });
    }

    // Base from the first successful payment paid_at
    const firstPaidAt = payments[0].paid_at ? new Date(payments[0].paid_at) : new Date();
    let cursor = firstPaidAt;

    for (const p of payments) {
      const m = Number((p as any).months || 0);
      if (m > 0) cursor = addMonths(cursor, m);
    }

    const newExpiry = cursor.toISOString();
    const latestPlan = String((payments[payments.length - 1] as any)?.plan || "unknown");

    // 4) Update the single memberships row
    const { error: memErr } = await supabase
      .from("memberships")
      .update({
        status: "active",
        plan: latestPlan,
        expires_at: newExpiry,
      })
      .eq("email", email);

    if (memErr) {
      return NextResponse.json(
        { ok: false, error: memErr.message || "Could not update membership expiry" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      status: "active",
      expires_at: newExpiry,
      remaining_payments: payments.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
