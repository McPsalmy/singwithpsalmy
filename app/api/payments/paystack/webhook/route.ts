import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RECOVERY_EXPIRY_MINUTES = 30;

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const resendKey = process.env.RESEND_API_KEY;

    if (!secret) return noStoreJson({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, 500);
    if (!supabaseUrl || !serviceRoleKey) return noStoreJson({ ok: false, error: "Missing Supabase env vars" }, 500);

    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature") || "";
    const rawBody = await req.text();
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (!signature || hash !== signature) {
      return noStoreJson({ ok: false, error: "Invalid signature" }, 400);
    }

    const event = JSON.parse(rawBody);
    const eventName = String(event?.event || "");
    if (eventName !== "charge.success") {
      return noStoreJson({ ok: true, ignored: eventName }, 200);
    }

    const reference = String(event?.data?.reference || "").trim();
    if (!reference) return noStoreJson({ ok: false, error: "Missing reference" }, 400);

    // Verify with Paystack API (source of truth)
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET", headers: { Authorization: `Bearer ${secret}` } }
    );

    const verifyOut = await verifyRes.json().catch(() => null);
    if (!verifyRes.ok || !verifyOut?.status) {
      return noStoreJson(
        { ok: false, error: verifyOut?.message || `Verify failed (HTTP ${verifyRes.status})` },
        500
      );
    }

    const data = verifyOut.data;
    if (data?.status !== "success") {
      return noStoreJson({ ok: true, note: `Not successful: ${data?.status}` }, 200);
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

    if (orderErr) return noStoreJson({ ok: false, error: orderErr.message }, 500);

    const siteUrl = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

    // =========================
    // MEMBERSHIP FLOW
    // =========================
    if (metadata?.kind === "membership") {
      const m = metadata?.membership || {};
      const plan = String(m?.plan || "").trim().toLowerCase();
      const months = Number(m?.months || 0);

      if (email && plan && months >= 1) {
        const amountKobo = Number(data?.amount || 0);
        const amountNaira = Math.round(amountKobo / 100);

        // Insert ledger (idempotent by unique paystack_reference)
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

        // OPTIONAL (recommended): recompute derived memberships immediately
        // If you prefer manual admin recompute only, comment this block.
        await recomputeMembershipsBestEffort(supabase);
      }

      // Send membership email (idempotent)
      if (email && resendKey) {
        const key = `member_receipt:${reference}`;
        const claimed = await claimEmailEvent(supabase, key, email, "member_receipt");
        if (claimed) {
          const html = renderMembershipEmail({
            siteUrl,
            reference,
            plan: String(metadata?.membership?.plan || "membership"),
            months: Number(metadata?.membership?.months || 1),
          });

          await sendResendEmail({
            resendKey,
            to: email,
            subject: "Membership activated — welcome to SingWithPsalmy",
            html,
          });
        }
      }

      return noStoreJson({ ok: true }, 200);
    }

    // =========================
    // ONE-TIME PURCHASE FLOW
    // =========================
    if (email && resendKey) {
      const key = `pay_receipt:${reference}`;
      const claimed = await claimEmailEvent(supabase, key, email, "pay_receipt");
      if (claimed) {
        const recoverUrl = `${siteUrl}/recover?reference=${encodeURIComponent(reference)}`;

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
          subject: "Payment received — your download is ready",
          html,
        });
      }
    }

    return noStoreJson({ ok: true }, 200);
  } catch (e: any) {
    // Important: if email sending throws, Paystack will retry webhook.
    // We still return 500 so you can investigate, but idempotent gate prevents duplicates.
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, 500);
  }
}

function noStoreJson(body: any, status = 200) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

async function claimEmailEvent(supabase: any, key: string, email: string, kind: string) {
  const { error } = await supabase.from("email_events").insert({ key, email, kind });
  if (!error) return true;

  const msg = String((error as any)?.message || "").toLowerCase();
  const looksDuplicate = msg.includes("duplicate") || msg.includes("unique");
  return false; // if duplicate (or any error), do not send again
}

async function recomputeMembershipsBestEffort(supabase: any) {
  // If you already have a DB function/recompute endpoint, keep it there.
  // This is a safe no-op placeholder (so this code compiles even if you remove it).
  return;
}

async function sendResendEmail(opts: { resendKey: string; to: string; subject: string; html: string }) {
  const from = "SingWithPsalmy <onboarding@resend.dev>"; // change after domain verification
  const replyTo = process.env.SUPPORT_EMAIL || "support@singwithpsalmy.com";

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
  if (!r.ok) throw new Error(data?.message || "Resend error");
}

function renderPurchaseEmail(opts: {
  siteUrl: string;
  recoverUrl: string;
  reference: string;
  items: any[];
  expiryMinutes: number;
}) {
  const { siteUrl, recoverUrl, reference, items, expiryMinutes } = opts;

  const dmcaUrl = `${siteUrl}/dmca`;
  const rightsUrl = `${siteUrl}/rights-holder`;

  const itemLines = (Array.isArray(items) ? items : [])
    .map((it) => {
      const slug = escapeHtml(String(it?.slug || ""));
      const version = escapeHtml(String(it?.version || ""));
      if (!slug) return "";
      return `<li style="margin:0 0 6px; color:rgba(255,255,255,0.78); font-family:Arial,sans-serif; font-size:13px;">
        <span style="color:#fff; font-weight:700;">${slug}</span>
        ${version ? `<span style="color:rgba(255,255,255,0.6);"> — ${version}</span>` : ""}
      </li>`;
    })
    .filter(Boolean)
    .join("");

  const itemsHtml =
    itemLines ||
    `<li style="margin:0; color:rgba(255,255,255,0.78); font-family:Arial,sans-serif; font-size:13px;">
      Your purchase is ready.
    </li>`;

  return baseEmail({
    title: "Payment received ✅",
    preheader: `Payment received. Your download is ready. Reference expires in ${expiryMinutes} minutes.`,
    bodyHtml: `
      <div style="color:rgba(255,255,255,0.75); font-size:14px; line-height:1.6;">
        Your download is ready. Use the recovery reference below to access your files.
      </div>

      <div style="margin:14px 0 16px;">
        <div style="display:inline-block; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px 12px;">
          <div style="color:rgba(255,255,255,0.65); font-size:12px; margin:0 0 4px;">Reference</div>
          <div style="color:#ffffff; font-size:14px; font-weight:700; letter-spacing:0.4px;">
            ${escapeHtml(reference)}
          </div>
        </div>
      </div>

      <div style="color:#ffffff; font-size:14px; font-weight:700; margin:0 0 8px;">Items</div>
      <ul style="margin:0 0 16px; padding:0 0 0 18px;">
        ${itemsHtml}
      </ul>

      ${ctaButton("Download your files", recoverUrl)}

      <div style="margin-top:10px; color:rgba(255,255,255,0.75); font-size:12px; line-height:1.6;">
        Important: this recovery reference expires after <strong>${expiryMinutes} minutes</strong>.
      </div>

      ${footerLinks(rightsUrl, dmcaUrl)}
    `,
  });
}

function renderMembershipEmail(opts: { siteUrl: string; reference: string; plan: string; months: number }) {
  const { siteUrl, reference, plan, months } = opts;
  const rightsUrl = `${siteUrl}/rights-holder`;
  const dmcaUrl = `${siteUrl}/dmca`;
  const membershipUrl = `${siteUrl}/membership`;
  const dashboardUrl = `${siteUrl}/dashboard`;

  return baseEmail({
    title: "Membership activated 🎉",
    preheader: "Your SingWithPsalmy membership is active.",
    bodyHtml: `
      <div style="color:rgba(255,255,255,0.75); font-size:14px; line-height:1.6;">
        Welcome! Your membership is now active, so you can download karaoke practice tracks instantly.
      </div>

      <div style="margin:14px 0 16px;">
        <div style="display:inline-block; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px 12px;">
          <div style="color:rgba(255,255,255,0.65); font-size:12px; margin:0 0 4px;">Reference</div>
          <div style="color:#ffffff; font-size:14px; font-weight:700; letter-spacing:0.4px;">
            ${escapeHtml(reference)}
          </div>
        </div>
      </div>

      <div style="margin:0 0 10px; color:rgba(255,255,255,0.75); font-size:13px; line-height:1.6;">
        Plan: <strong style="color:#fff;">${escapeHtml(plan)}</strong><br/>
        Duration: <strong style="color:#fff;">${Number(months) || 1} month(s)</strong>
      </div>

      ${ctaButton("Go to your dashboard", dashboardUrl)}
      <div style="margin-top:10px;">
        <a href="${membershipUrl}" style="color:#ffffff; text-decoration:underline; font-family:Arial,sans-serif; font-size:12px;">
          Manage membership
        </a>
      </div>

      ${footerLinks(rightsUrl, dmcaUrl)}
    `,
  });
}

function baseEmail(opts: { title: string; preheader: string; bodyHtml: string }) {
  const { title, preheader, bodyHtml } = opts;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(title)}</title></head>
<body style="margin:0; padding:0; background:#07070a;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#07070a; padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px;">
          <tr>
            <td style="padding:14px 0 18px;">
              <div style="font-family:Arial, sans-serif; color:#ffffff; font-size:14px; letter-spacing:0.6px;">
                <span style="font-weight:700;">SingWithPsalmy</span>
                <span style="color:rgba(255,255,255,0.6);"> • Karaoke practice tracks</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#0f1016; border:1px solid rgba(255,255,255,0.10); border-radius:18px; padding:22px;">
              <div style="font-family:Arial, sans-serif; color:#ffffff; font-size:22px; font-weight:700; margin:0 0 10px;">
                ${escapeHtml(title)}
              </div>
              ${bodyHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:14px 4px 0;">
              <div style="font-family:Arial, sans-serif; color:rgba(255,255,255,0.45); font-size:11px; line-height:1.6;">
                © ${new Date().getUTCFullYear()} SingWithPsalmy • Nigeria-first karaoke practice tracks
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 0;">
    <tr><td>
      <a href="${url}"
        style="display:inline-block; font-family:Arial, sans-serif; background:#ffffff; color:#000000; text-decoration:none; font-weight:700; font-size:14px; padding:12px 16px; border-radius:12px;">
        ${escapeHtml(label)}
      </a>
    </td></tr>
  </table>`;
}

function footerLinks(rightsUrl: string, dmcaUrl: string) {
  return `
    <hr style="border:none; border-top:1px solid rgba(255,255,255,0.10); margin:18px 0;">
    <div style="font-family:Arial, sans-serif; color:rgba(255,255,255,0.65); font-size:12px; line-height:1.6;">
      Rights-holders & publishers: licensing, promotion, or concerns —
      <a href="${rightsUrl}" style="color:#ffffff; text-decoration:underline;">Rights-holder page</a>.
      <br/>
      DMCA takedown:
      <a href="${dmcaUrl}" style="color:#ffffff; text-decoration:underline;">DMCA page</a>.
    </div>
  `;
}

function escapeHtml(input: string) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}