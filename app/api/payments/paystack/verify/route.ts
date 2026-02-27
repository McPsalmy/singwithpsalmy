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

    // rate limit
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `pay_verify:${ip}`, limit: 30, windowMs: 5 * 60 * 1000 });
    if (!rl.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts." }, { status: 429 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1️⃣ Verify with Paystack
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
      }
    );

    const out = await res.json().catch(() => null);
    if (!res.ok || !out?.status) {
      return noStoreJson(
        { ok: false, error: out?.message || "Verify failed" },
        { status: 500 }
      );
    }

    const data = out.data;
    if (data?.status !== "success") {
      return noStoreJson(
        { ok: false, error: "Payment not successful" },
        { status: 400 }
      );
    }

    const metadata = data?.metadata || {};
    const kind = metadata?.kind || "";
    const email =
      data?.customer?.email ||
      metadata?.email ||
      null;

    // Save order record (idempotent)
    await supabase.from("orders").upsert(
      {
        paystack_reference: reference,
        email,
        amount: Number(data?.amount || 0),
        currency: String(data?.currency || "NGN"),
        items: metadata?.items || [],
        status: "paid",
        paid_at: data?.paid_at || null,
      },
      { onConflict: "paystack_reference" }
    );

    // ==========================
    // MEMBERSHIP FLOW
    // ==========================
    if (kind === "membership") {
      const plan = String(metadata?.membership?.plan || "").toLowerCase();
      const months = Number(metadata?.membership?.months || 0);

      if (!email || !plan || months < 1) {
        return noStoreJson(
          { ok: false, error: "Invalid membership metadata" },
          { status: 400 }
        );
      }

      const amountNaira = Math.round(Number(data?.amount || 0) / 100);
      const paidAt = new Date(data.paid_at);

      // Insert ledger (ignore duplicate)
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
        const msg = String(mpErr.message || "").toLowerCase();
        const duplicate =
          msg.includes("duplicate") || msg.includes("unique");
        if (!duplicate) {
          return noStoreJson(
            { ok: false, error: mpErr.message },
            { status: 500 }
          );
        }
      }

      // Extend membership immediately
      const { data: existing } = await supabase
        .from("memberships")
        .select("expires_at")
        .eq("email", email)
        .maybeSingle();

      const currentExpiry =
        existing?.expires_at ? new Date(existing.expires_at) : null;

      const base =
        currentExpiry && currentExpiry.getTime() > Date.now()
          ? currentExpiry
          : paidAt;

      const expiresAt = addMonths(base, months);

      const { error: memErr } = await supabase
        .from("memberships")
        .upsert(
          {
            email,
            plan,
            status: "active",
            started_at: paidAt.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "email" }
        );

      if (memErr) {
        return noStoreJson(
          { ok: false, error: memErr.message },
          { status: 500 }
        );
      }

      return noStoreJson({
        ok: true,
        kind: "membership",
        email,
        plan,
        months,
        expires_at: expiresAt.toISOString(),
      });
    }

    // ==========================
    // ONE-TIME PURCHASE
    // ==========================
    return noStoreJson({
      ok: true,
      kind: "purchase",
      items: metadata?.items || [],
    });

  } catch (e: any) {
    return noStoreJson(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}