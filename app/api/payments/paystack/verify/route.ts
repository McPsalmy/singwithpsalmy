import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function GET(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Missing PAYSTACK_SECRET_KEY" },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceRoleKey) {
  return NextResponse.json(
    { ok: false, error: "Missing Supabase env vars" },
    { status: 500 }
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});


    const url = new URL(req.url);
    const reference = String(url.searchParams.get("reference") || "").trim();

    if (!reference) {
      return NextResponse.json({ ok: false, error: "Missing reference" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      }
    );

    const out = await res.json().catch(() => null);

    if (!res.ok || !out?.status) {
      return NextResponse.json(
        { ok: false, error: out?.message || `Verify failed (HTTP ${res.status})`, raw: out },
        { status: 500 }
      );
    }

    const data = out.data;

    // Paystack success signal: data.status === "success"
    if (data?.status !== "success") {
      return NextResponse.json(
        { ok: false, error: `Payment not successful: ${data?.status || "unknown"}`, raw: data },
        { status: 400 }
      );
    }

    // 30-minute recovery window
const MAX_MINUTES = 30;
const paidAt = data?.paid_at ? new Date(data.paid_at).getTime() : 0;

if (!paidAt) {
  return NextResponse.json({ ok: false, error: "Missing paid_at timestamp" }, { status: 401 });
}

if (Date.now() - paidAt > MAX_MINUTES * 60 * 1000) {
  return NextResponse.json(
    { ok: false, error: `Recovery window expired (${MAX_MINUTES} minutes).` },
    { status: 403 }
  );
}


    // We stored cart details in metadata during initialize
    const metadata = data?.metadata || {};
    const items = metadata?.items || [];

    const email =
  data?.customer?.email ||
  data?.metadata?.email ||
  metadata?.email ||
  null;

// Persist order (idempotent by paystack_reference unique)
const { error: orderErr } = await supabase
  .from("orders")
  .upsert(
    {
      paystack_reference: reference,
      email,
      amount: Number(data?.amount || 0), // Paystack returns amount in kobo
      currency: String(data?.currency || "NGN"),
      items,
      status: "paid",
      paid_at: data?.paid_at || null,
    },
    { onConflict: "paystack_reference" }
  );

if (orderErr) {
  return NextResponse.json(
    { ok: false, error: orderErr.message || "Could not save order" },
    { status: 500 }
  );
}


    return NextResponse.json({
      ok: true,
      reference,
      amount: data?.amount, // kobo
      currency: data?.currency,
      paid_at: data?.paid_at,
      items,
      metadata,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
