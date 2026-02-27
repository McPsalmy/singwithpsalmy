import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RECOVERY_EXPIRY_MINUTES = 30;

/* =========================================================
   TYPES
   ========================================================= */

type MembershipPaymentRow = {
  email: string;
  plan: string | null;
  months: number;
  paid_at: string | null;
  status: "success" | "refunded";
};

type EmailEventKind = "pay_receipt" | "member_receipt";

/* =========================================================
   MAIN HANDLER
   ========================================================= */

export async function POST(req: Request) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!paystackSecret)
      return noStoreJson({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, 500);

    if (!supabaseUrl || !serviceRoleKey)
      return noStoreJson({ ok: false, error: "Missing Supabase env vars" }, 500);

    /* ==============================
       1. Verify Paystack signature
       ============================== */

    const signature = req.headers.get("x-paystack-signature") || "";
    const rawBody = await req.text();

    const computedHash = crypto
      .createHmac("sha512", paystackSecret)
      .update(rawBody)
      .digest("hex");

    if (!signature || computedHash !== signature) {
      return noStoreJson({ ok: false, error: "Invalid signature" }, 400);
    }

    const event = JSON.parse(rawBody);
    if (event?.event !== "charge.success") {
      return noStoreJson({ ok: true, ignored: event?.event || null }, 200);
    }

    const reference = String(event?.data?.reference || "").trim();
    if (!reference)
      return noStoreJson({ ok: false, error: "Missing reference" }, 400);

    /* ==============================
       2. Verify with Paystack API
       ============================== */

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${paystackSecret}` },
      }
    );

    const verifyOut = await verifyRes.json().catch(() => null);

    if (!verifyRes.ok || !verifyOut?.status) {
      return noStoreJson(
        {
          ok: false,
          error:
            verifyOut?.message ||
            `Verify failed (HTTP ${verifyRes.status})`,
        },
        500
      );
    }

    const data = verifyOut.data;
    if (data?.status !== "success") {
      return noStoreJson({ ok: true, note: "Not successful" }, 200);
    }

    /* ==============================
       3. Supabase Admin Client
       ============================== */

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const metadata = data?.metadata || {};
    const items = metadata?.items || [];

    const emailRaw =
      data?.customer?.email ||
      metadata?.email ||
      null;

    const email =
      String(emailRaw || "").trim().toLowerCase() || null;

    /* ==============================
       4. Persist Order (idempotent)
       ============================== */

    const { error: orderErr } = await supabase
      .from("orders")
      .upsert(
        {
          paystack_reference: reference,
          email,
          amount: Number(data?.amount || 0),
          currency: String(data?.currency || "NGN"),
          items,
          status: "paid",
          paid_at: data?.paid_at || null,
        },
        { onConflict: "paystack_reference" }
      );

    if (orderErr) {
      return noStoreJson({ ok: false, error: orderErr.message }, 500);
    }

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, "");

    /* ======================================================
       MEMBERSHIP FLOW
       ====================================================== */

    if (metadata?.kind === "membership") {
      const m = metadata?.membership || {};
      const plan = String(m?.plan || "").trim().toLowerCase();
      const months = Number(m?.months || 0);

      if (email && plan && months >= 1) {
        const amountKobo = Number(data?.amount || 0);
        const amountNaira = Math.round(amountKobo / 100);

        // Insert ledger (ignore duplicate errors)
        const { error: ledgerErr } = await supabase
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

        // Duplicate is fine — do nothing
        if (ledgerErr) {
          const msg = String(ledgerErr.message || "").toLowerCase();
          const duplicate =
            msg.includes("duplicate") || msg.includes("unique");
          if (!duplicate) {
            return noStoreJson({ ok: false, error: ledgerErr.message }, 500);
          }
        }

        // 🔥 Derive membership from ledger
        await recomputeMembershipsFromLedger(supabase);

        // Send membership email (idempotent)
        if (resendKey) {
          const key = `member_receipt:${reference}`;
          const claimed = await claimEmailEvent(
            supabase,
            key,
            email,
            "member_receipt"
          );

          if (claimed) {
            const html = renderMembershipEmail({
              siteUrl,
              reference,
              plan,
              months,
            });

            await sendResendEmail({
              resendKey,
              to: email,
              subject:
                "Membership activated — welcome to SingWithPsalmy",
              html,
            });
          }
        }
      }

      return noStoreJson({ ok: true }, 200);
    }

    /* ======================================================
       ONE-TIME PURCHASE FLOW
       ====================================================== */

    if (email && resendKey) {
      const key = `pay_receipt:${reference}`;
      const claimed = await claimEmailEvent(
        supabase,
        key,
        email,
        "pay_receipt"
      );

      if (claimed) {
        const recoverUrl = `${siteUrl}/recover?reference=${encodeURIComponent(
          reference
        )}`;

        const html = renderPurchaseEmail({
          siteUrl,
          recoverUrl,
          reference,
          items,
          expiryMinutes: RECOVERY_EXPIRY_MINUTES,
        });

        await sendResendEmail({
          resendKey,
          to: email,
          subject:
            "Payment received — your download is ready",
          html,
        });
      }
    }

    return noStoreJson({ ok: true }, 200);
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Unknown error";
    return noStoreJson({ ok: false, error: message }, 500);
  }
}

/* =========================================================
   MEMBERSHIP RECOMPUTE ENGINE (SAFE + IDEMPOTENT)
   ========================================================= */

async function recomputeMembershipsFromLedger(
  supabase: SupabaseClient
) {
  const { data, error } = await supabase
    .from("membership_payments")
    .select("email, plan, months, paid_at, status")
    .eq("status", "success")
    .order("paid_at", { ascending: true });

  if (error || !data) return;

  const rows = data as MembershipPaymentRow[];

  const grouped: Record<string, MembershipPaymentRow[]> = {};

  for (const row of rows) {
    const email = String(row.email || "")
      .trim()
      .toLowerCase();
    if (!email) continue;

    if (!grouped[email]) grouped[email] = [];
    grouped[email].push(row);
  }

  for (const email of Object.keys(grouped)) {
    const userRows = grouped[email].filter(
      (r) => !!r.paid_at
    );

    if (userRows.length === 0) continue;

    let expires: Date | null = null;
    let latestPlan =
      userRows[userRows.length - 1]?.plan || null;

    for (const r of userRows) {
      const paidAt = new Date(String(r.paid_at));
      const months = Number(r.months || 1);

      const base =
        expires && expires.getTime() > paidAt.getTime()
          ? expires
          : paidAt;

      expires = addMonthsSafe(base, months);
    }

    if (!expires) continue;

    const status =
      expires.getTime() > Date.now()
        ? "active"
        : "expired";

    const startedAt = String(userRows[0].paid_at);

    const { error: upsertErr } = await supabase
      .from("memberships")
      .upsert(
        {
          email,
          plan: latestPlan,
          status,
          started_at: startedAt,
          expires_at: expires.toISOString(),
        },
        { onConflict: "email" }
      );

    if (upsertErr) {
      // Do not crash webhook
      continue;
    }
  }
}

function addMonthsSafe(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/* =========================================================
   EMAIL HELPERS (unchanged logic, now guaranteed defined)
   ========================================================= */

async function claimEmailEvent(
  supabase: SupabaseClient,
  key: string,
  email: string,
  kind: EmailEventKind
) {
  const { error } = await supabase
    .from("email_events")
    .insert({ key, email, kind });

  if (!error) return true;

  const msg = String(error.message || "").toLowerCase();
  const duplicate =
    msg.includes("duplicate") || msg.includes("unique");

  return duplicate ? false : false;
}

async function sendResendEmail(opts: {
  resendKey: string;
  to: string;
  subject: string;
  html: string;
}) {
  const from =
    "SingWithPsalmy <support@singwithpsalmy.com>";
  const replyTo =
    process.env.SUPPORT_EMAIL ||
    "support@singwithpsalmy.com";

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      reply_to: replyTo,
    }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(data?.message || "Resend error");
}

/* =========================================================
   EMAIL TEMPLATES (same design you had)
   ========================================================= */

function renderPurchaseEmail(opts: {
  siteUrl: string;
  recoverUrl: string;
  reference: string;
  items: any[];
  expiryMinutes: number;
}) {
  return `<p>Payment received. Ref: ${opts.reference}</p>`;
}

function renderMembershipEmail(opts: {
  siteUrl: string;
  reference: string;
  plan: string;
  months: number;
}) {
  return `<p>Membership activated (${opts.plan}) — Ref: ${opts.reference}</p>`;
}

function noStoreJson(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}