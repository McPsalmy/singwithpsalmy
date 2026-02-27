import { createClient } from "@supabase/supabase-js";
import { getClientIp, noStoreJson, rateLimit } from "../../../../lib/security";

function addMonths(from: Date, months: number) {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return noStoreJson({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return noStoreJson({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    const url = new URL(req.url);
    const reference = String(url.searchParams.get("reference") || "").trim();
    if (!reference) {
      return noStoreJson({ ok: false, error: "Missing reference" }, { status: 400 });
    }

    // Rate limit verify attempts
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `pay_verify:${ip}`, limit: 30, windowMs: 5 * 60 * 1000 });
    if (!rl.ok) return noStoreJson({ ok: false, error: "Too many attempts." }, { status: 429 });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Verify with Paystack (source of truth)
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET", headers: { Authorization: `Bearer ${secret}` } }
    );

    const verifyOut = await verifyRes.json().catch(() => null);

    if (!verifyRes.ok || !verifyOut?.status) {
      return noStoreJson(
        { ok: false, error: verifyOut?.message || `Verify failed (HTTP ${verifyRes.status})` },
        { status: 500 }
      );
    }

    const data = verifyOut.data;
    if (data?.status !== "success") {
      return noStoreJson({ ok: false, error: `Payment not successful: ${data?.status || "unknown"}` }, { status: 400 });
    }

    const metadata = data?.metadata || {};
    const kind = String(metadata?.kind || "");
    const items = metadata?.items || [];

    const email =
      data?.customer?.email ||
      metadata?.email ||
      null;

    // 2) Persist order (idempotent)
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
      return noStoreJson({ ok: false, error: orderErr.message || "Could not save order" }, { status: 500 });
    }

    // ==========================
    // MEMBERSHIP FLOW
    // ==========================
    if (kind === "membership") {
      const m = metadata?.membership || {};
      const plan = String(m?.plan || "").trim().toLowerCase();
      const months = Number(m?.months || 0);

      if (!email) return noStoreJson({ ok: false, error: "Missing email for membership" }, { status: 400 });
      if (!plan || !months || months < 1) {
        return noStoreJson({ ok: false, error: "Invalid membership metadata" }, { status: 400 });
      }

      const amountKobo = Number(data?.amount || 0);
      const amountNaira = Math.round(amountKobo / 100);
      const paidAtDate = data?.paid_at ? new Date(data.paid_at) : new Date();

      // 3) Insert ledger row (idempotent by unique paystack_reference)
      const { error: mpErr } = await supabase
        .from("membership_payments")
        .insert({
          paystack_reference: reference,
          email,
          plan,
          months,
          amount: amountNaira,
          currency: String(data?.currency || "NGN"),
          status: "success",
          paid_at: data?.paid_at || null,
        });

      if (mpErr) {
        const msg = String((mpErr as any)?.message || "").toLowerCase();
        const looksDuplicate = msg.includes("duplicate") || msg.includes("unique");
        if (!looksDuplicate) {
          return noStoreJson(
            { ok: false, error: (mpErr as any)?.message || "Could not save membership payment" },
            { status: 500 }
          );
        }
        // If duplicate reference, we continue to ensure memberships row exists (safe)
      }

      // 4) Extend membership (memberships table is derived “current state”)
      const { data: existing } = await supabase
        .from("memberships")
        .select("expires_at,status")
        .eq("email", email)
        .maybeSingle();

      const currentExpiry =
        existing?.expires_at ? new Date(existing.expires_at) : null;

      const base =
        currentExpiry &&
        existing?.status === "active" &&
        currentExpiry.getTime() > Date.now()
          ? currentExpiry
          : paidAtDate;

      const expiresAt = addMonths(base, months);

      // ✅ IMPORTANT: include months (your table requires it)
      const { error: memErr } = await supabase
        .from("memberships")
        .upsert(
          {
            email,
            plan,
            months,
            status: "active",
            started_at: paidAtDate.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "email" }
        );

      if (memErr) {
        return noStoreJson({ ok: false, error: memErr.message || "Could not save membership" }, { status: 500 });
      }

      return noStoreJson({
        ok: true,
        reference,
        kind: "membership",
        email,
        plan,
        months,
        expires_at: expiresAt.toISOString(),
        paid_at: data?.paid_at,
        currency: data?.currency,
      });
    }

    // ==========================
    // ONE-TIME PURCHASE
    // ==========================
    return noStoreJson({
      ok: true,
      reference,
      kind: "purchase",
      email,
      items,
      paid_at: data?.paid_at,
      currency: data?.currency,
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}