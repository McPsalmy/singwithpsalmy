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

    // Rate limit verify
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `pay_verify:${ip}`, limit: 30, windowMs: 5 * 60 * 1000 });
    if (!rl.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }
    const rl2 = rateLimit({ key: `pay_verify_ref:${ip}:${reference}`, limit: 10, windowMs: 10 * 60 * 1000 });
    if (!rl2.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts for this reference. Try again later." }, { status: 429 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify on Paystack
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET", headers: { Authorization: `Bearer ${secret}` } }
    );

    const out = await res.json().catch(() => null);

    if (!res.ok || !out?.status) {
      return noStoreJson(
        { ok: false, error: out?.message || `Verify failed (HTTP ${res.status})`, raw: out },
        { status: 500 }
      );
    }

    const data = out.data;

    if (data?.status !== "success") {
      return noStoreJson(
        { ok: false, error: `Payment not successful: ${data?.status || "unknown"}`, raw: data },
        { status: 400 }
      );
    }

    // 30-minute recovery window
    const MAX_MINUTES = 30;
    const paidAtMs = data?.paid_at ? new Date(data.paid_at).getTime() : 0;

    if (!paidAtMs) {
      return noStoreJson({ ok: false, error: "Missing paid_at timestamp" }, { status: 401 });
    }

    if (Date.now() - paidAtMs > MAX_MINUTES * 60 * 1000) {
      return noStoreJson(
        { ok: false, error: `Recovery window expired (${MAX_MINUTES} minutes).` },
        { status: 403 }
      );
    }

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
      return noStoreJson(
        { ok: false, error: orderErr.message || "Could not save order" },
        { status: 500 }
      );
    }

    // MEMBERSHIP FLOW (fix double-credit)
    if (metadata?.kind === "membership") {
      const m = metadata?.membership || {};
      const plan = String(m?.plan || "").trim().toLowerCase();
      const months = Number(m?.months || 0);

      if (!email) {
        return noStoreJson({ ok: false, error: "Missing email for membership" }, { status: 400 });
      }
      if (!plan || !months || months < 1) {
        return noStoreJson({ ok: false, error: "Invalid membership metadata" }, { status: 400 });
      }

      const amountKobo = Number(data?.amount || 0);
      const amountNaira = Math.round(amountKobo / 100);

      // 1) Insert into ledger FIRST (idempotent gate)
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
        const msg = (mpErr as any)?.message || "";
        const looksLikeDuplicate =
          msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique");

        if (!looksLikeDuplicate) {
          return noStoreJson(
            { ok: false, error: mpErr.message || "Could not save membership payment" },
            { status: 500 }
          );
        }

        // Duplicate reference => do NOT extend again
        // Return current membership state (best effort)
        const { data: cur } = await supabase
          .from("memberships")
          .select("plan,status,expires_at")
          .eq("email", email)
          .maybeSingle();

        const resp = noStoreJson({
          ok: true,
          reference,
          kind: "membership",
          email,
          plan: cur?.plan ?? plan,
          months,
          expires_at: cur?.expires_at ?? null,
          paid_at: data?.paid_at,
          currency: data?.currency,
          duplicate: true,
        });

        resp.cookies.set("swp_member", "1", {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 400,
        });
        resp.cookies.set("swp_member_email", String(email || ""), {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 400,
        });

        return resp;
      }

      // 2) Only now extend membership (safe)
      const paidAtDate = new Date(data.paid_at);

      const { data: existing } = await supabase
        .from("memberships")
        .select("expires_at,status")
        .eq("email", email)
        .in("status", ["active"])
        .order("expires_at", { ascending: false })
        .limit(1);

      const currentExpiry =
        existing?.[0]?.expires_at ? new Date(existing[0].expires_at) : null;

      const base =
        currentExpiry && currentExpiry.getTime() > Date.now()
          ? currentExpiry
          : paidAtDate;

      const expiresAt = addMonths(base, months);

      const { error: memErr } = await supabase
        .from("memberships")
        .upsert(
          {
            email,
            plan,
            status: "active",
            started_at: paidAtDate.toISOString(),
            expires_at: expiresAt.toISOString(),
          },
          { onConflict: "email" }
        );

      if (memErr) {
        return noStoreJson(
          { ok: false, error: memErr.message || "Could not save membership" },
          { status: 500 }
        );
      }

      const resp = noStoreJson({
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

      resp.cookies.set("swp_member", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
      });

      resp.cookies.set("swp_member_email", String(email || ""), {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 400,
      });

      return resp;
    }

    // Non-membership purchase
    return noStoreJson({
      ok: true,
      reference,
      amount: data?.amount,
      currency: data?.currency,
      paid_at: data?.paid_at,
      items,
      metadata,
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}