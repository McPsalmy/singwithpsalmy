import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    // Verify Paystack signature (IMPORTANT)
    const signature = req.headers.get("x-paystack-signature") || "";
    const rawBody = await req.text();

    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (!signature || hash !== signature) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventName = String(event?.event || "");

    // We only care about successful charges
    if (eventName !== "charge.success") {
      return NextResponse.json({ ok: true, ignored: eventName });
    }

    const reference = String(event?.data?.reference || "").trim();
    if (!reference) {
      return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 });
    }

    // Verify with Paystack API (source of truth)
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
      }
    );

    const verifyOut = await verifyRes.json().catch(() => null);
    if (!verifyRes.ok || !verifyOut?.status) {
      return NextResponse.json(
        { ok: false, error: verifyOut?.message || `Verify failed (HTTP ${verifyRes.status})` },
        { status: 500 }
      );
    }

    const data = verifyOut.data;
    if (data?.status !== "success") {
      return NextResponse.json({ ok: true, note: `Not successful: ${data?.status}` });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const metadata = data?.metadata || {};
    const items = metadata?.items || [];
    const email =
      data?.customer?.email ||
      data?.metadata?.email ||
      metadata?.email ||
      null;

    // Persist order (idempotent)
    const { error: orderErr } = await supabase
      .from("orders")
      .upsert(
        {
          paystack_reference: reference,
          email,
          amount: Number(data?.amount || 0), // kobo
          currency: String(data?.currency || "NGN"),
          items,
          status: "paid",
          paid_at: data?.paid_at || null,
        },
        { onConflict: "paystack_reference" }
      );

    if (orderErr) {
      return NextResponse.json({ ok: false, error: orderErr.message }, { status: 500 });
    }

    // Membership payments: record in ledger ONLY (no cookies from webhook)
    if (metadata?.kind === "membership") {
      const m = metadata?.membership || {};
      const plan = String(m?.plan || "").trim().toLowerCase();
      const months = Number(m?.months || 0);

      if (email && plan && months >= 1) {
        const amountKobo = Number(data?.amount || 0);
        const amountNaira = Math.round(amountKobo / 100);

        // Insert ledger record (idempotent by unique paystack_reference)
        await supabase.from("membership_payments").insert({
          paystack_reference: reference,
          email,
          plan,
          months,
          amount: amountNaira,
          currency: String(data?.currency || "NGN"),
          status: "success",
          paid_at: data?.paid_at || null,
        });

        // Optional: trigger recompute endpoint later if you want it automatic
        // (you already have /api/admin/memberships/recompute)
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
