import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/**
 * Remaining months from now until expiry.
 * Returns 0 if expired.
 * Uses calendar-month math (not 30-day buckets).
 */
function remainingMonths(now: Date, expires: Date) {
  if (expires.getTime() <= now.getTime()) return 0;

  let months =
    (expires.getFullYear() - now.getFullYear()) * 12 +
    (expires.getMonth() - now.getMonth());

  // If expiry day/time is after "now day/time" within the month, count the current partial month as 1.
  // If expiry is earlier in the month than now, reduce by 1.
  const nowY = now.getFullYear(),
    nowM = now.getMonth(),
    nowD = now.getDate(),
    nowT = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const expY = expires.getFullYear(),
    expM = expires.getMonth(),
    expD = expires.getDate(),
    expT = expires.getHours() * 3600 + expires.getMinutes() * 60 + expires.getSeconds();

  if (expY === nowY && expM === nowM) {
    // same month
    return 1; // expiry is in the future (checked above) => at least 1 month remaining
  }

  // If expiry day/time is before now day/time in its month, months stays as is.
  // If expiry day/time is after now day/time relative to month boundaries, include the last partial month.
  // Practical rule: if expiry day is greater than now day (or equal but later time), count that last month.
  if (expD > nowD || (expD === nowD && expT >= nowT)) {
    months += 1;
  }

  if (months < 1) months = 1;
  return months;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Normalize any accidental 'active' statuses in the ledger (counts as success)
    await supabase
      .from("membership_payments")
      .update({ status: "success" })
      .eq("email", email)
      .eq("status", "active");

    // Only count non-refunded payments
    const { data: payments, error: listErr } = await supabase
      .from("membership_payments")
      .select("months,paid_at,plan,status")
      .eq("email", email)
      .neq("status", "refunded")
      .order("paid_at", { ascending: true });

    if (listErr) {
      return NextResponse.json(
        { ok: false, error: listErr.message || "Could not list payments" },
        { status: 500 }
      );
    }

    if (!payments || payments.length === 0) {
      // No valid payments → expire membership
      const { error: memErr } = await supabase
        .from("memberships")
        .upsert(
          {
            email,
            status: "expired",
            plan: null,
            started_at: null,
            expires_at: new Date(0).toISOString(),
            months: 0,
          },
          { onConflict: "email" }
        );

      if (memErr) {
        return NextResponse.json(
          { ok: false, error: memErr.message || "Could not update membership" },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, email, status: "expired", expires_at: null, months: 0 });
    }

    const firstPaidAt = payments[0].paid_at ? new Date(payments[0].paid_at) : new Date();
    let cursor = new Date(firstPaidAt);

    for (const p of payments) {
      const m = Number((p as any).months || 0);
      if (m > 0) cursor = addMonths(cursor, m);
    }

    const expiresAtDate = cursor;
    const expiresAt = expiresAtDate.toISOString();

    const latestPlan = String((payments[payments.length - 1] as any)?.plan || "unknown");
    const isActive = expiresAtDate.getTime() > Date.now();

    const monthsLeft = remainingMonths(new Date(), expiresAtDate);

    const { error: memErr } = await supabase
      .from("memberships")
      .upsert(
        {
          email,
          status: isActive ? "active" : "expired",
          plan: latestPlan,
          started_at: firstPaidAt.toISOString(),
          expires_at: expiresAt,
          months: isActive ? monthsLeft : 0,
        },
        { onConflict: "email" }
      );

    if (memErr) {
      return NextResponse.json(
        { ok: false, error: memErr.message || "Could not update membership" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      status: isActive ? "active" : "expired",
      expires_at: expiresAt,
      months: isActive ? monthsLeft : 0,
      counted_payments: payments.length,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}