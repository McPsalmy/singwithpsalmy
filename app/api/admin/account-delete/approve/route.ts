import { noStoreJson } from "../../../../lib/security";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function getAdminCookie(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)swp_admin=([^;]+)/);
  return m?.[1] || "";
}

type Body = {
  requestId: string;
};

export async function POST(req: Request) {
  try {
    // ✅ Admin gate
    const adminCookie = getAdminCookie(req);
    if (!adminCookie) {
      return noStoreJson({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const siteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
      .trim()
      .replace(/\/+$/, "");

    if (!resendKey) {
      return noStoreJson({ ok: false, error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const requestId = String(body?.requestId || "").trim();

    if (!requestId) {
      return noStoreJson({ ok: false, error: "Missing requestId" }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1) Load request
    const { data: reqRow, error: reqErr } = await admin
      .from("account_delete_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr) return noStoreJson({ ok: false, error: reqErr.message }, { status: 500 });
    if (!reqRow) return noStoreJson({ ok: false, error: "Request not found" }, { status: 404 });

    const status = String(reqRow.status || "").toLowerCase();
    if (status && status !== "open") {
      return noStoreJson({ ok: false, error: "Request already processed" }, { status: 409 });
    }

    const email = String(reqRow.email || "").trim().toLowerCase();
    if (!email) return noStoreJson({ ok: false, error: "Request has no email" }, { status: 400 });

    // 2) Find auth user by email (admin list)
    const { data: users, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 2000,
    });

    if (listErr) return noStoreJson({ ok: false, error: listErr.message }, { status: 500 });

    const match = (users?.users || []).find((u) => (u.email || "").toLowerCase() === email);

    // 3) Delete auth user (removes login)
    if (match?.id) {
      const { error: delErr } = await admin.auth.admin.deleteUser(match.id);
      if (delErr) return noStoreJson({ ok: false, error: delErr.message }, { status: 500 });
    }

    // 4) Mark request approved
    const approvedAt = new Date().toISOString();
    const { error: updErr } = await admin
      .from("account_delete_requests")
      .update({ status: "approved", approved_at: approvedAt })
      .eq("id", requestId);

    if (updErr) return noStoreJson({ ok: false, error: updErr.message }, { status: 500 });

    // 5) Send branded "Account deleted" email (idempotent via email_events)
    //    If you click twice, it will not double-send.
    const emailEventKey = `acct_deleted:${requestId}`;
    const claimed = await claimEmailEvent(admin, emailEventKey, email, "acct_deleted");

    if (claimed) {
      const html = renderAccountDeletedEmail({ siteUrl });

      await sendResendEmail({
        resendKey,
        to: email,
        subject: "Your account has been deleted — SingWithPsalmy",
        html,
      });
    }

    return noStoreJson(
      { ok: true, deletedAuthUser: !!match?.id, emailed: claimed },
      { status: 200 }
    );
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown server error" }, { status: 500 });
  }
}

// ---------- helpers (copied style from your webhook) ----------

async function claimEmailEvent(supabase: any, key: string, email: string, kind: string) {
  const { error } = await supabase.from("email_events").insert({ key, email, kind });
  if (!error) return true;

  // If duplicate (or any error), do not send again
  return false;
}

async function sendResendEmail(opts: { resendKey: string; to: string; subject: string; html: string }) {
  // Change after domain verification:
  const from = "SingWithPsalmy <onboarding@resend.dev>";
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

function renderAccountDeletedEmail(opts: { siteUrl: string }) {
  const { siteUrl } = opts;

  const rightsUrl = `${siteUrl}/rights-holder`;
  const dmcaUrl = `${siteUrl}/dmca`;
  const signupUrl = `${siteUrl}/signup`;

  return baseEmail({
    title: "Your account has been deleted",
    preheader: "This confirms your SingWithPsalmy account has been deleted.",
    bodyHtml: `
      <div style="color:rgba(255,255,255,0.75); font-size:14px; line-height:1.7;">
        This email confirms that your SingWithPsalmy account has been deleted following your request.
      </div>

      <div style="margin-top:16px; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);">
        <div style="color:#ffffff; font-weight:700; font-size:13px;">
          About your concern
        </div>
        <div style="margin-top:6px; color:rgba(255,255,255,0.70); font-size:12px; line-height:1.7;">
          We’ve noted the concern you raised. Our team is reviewing it carefully and making improvements where needed.
          We sincerely appreciate the feedback, and we would love to welcome you back anytime.
        </div>
      </div>

      <div style="margin-top:16px; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.03);">
        <div style="color:#ffffff; font-weight:700; font-size:13px;">
          What we retain (for compliance)
        </div>
        <div style="margin-top:6px; color:rgba(255,255,255,0.70); font-size:12px; line-height:1.7;">
          Some payment records may be retained for legal and accounting compliance, but your account access is removed
          and your profile details are deleted or anonymized.
        </div>
      </div>

      ${ctaButton("Create a new account", signupUrl)}

      ${footerLinks(rightsUrl, dmcaUrl)}
    `,
  });
}

// --- Email UI helpers (same premium style as your webhook emails)

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