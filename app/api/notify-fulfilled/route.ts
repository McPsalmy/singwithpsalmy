import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email || "").trim();
    const songTitle = String(body?.songTitle || "").trim();
    const artist = String(body?.artist || "").trim();

    if (!email || !songTitle) {
      return NextResponse.json(
        { ok: false, error: "Missing email or songTitle" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const siteUrl = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
    const query = `${songTitle}${artist ? ` ${artist}` : ""}`.trim();
    const link = `${siteUrl}/browse?query=${encodeURIComponent(songTitle)}`;

    const subject = `Now available on SingWithPsalmy: ${songTitle}`;

    // NOTE: Change this after Resend domain verification:
    // e.g. SingWithPsalmy <support@singwithpsalmy.com>
    const from = "SingWithPsalmy <support@singwithpsalmy.com>";

    // Optional: make replies go somewhere useful
    const replyTo = process.env.SUPPORT_EMAIL || "support@singwithpsalmy.com";

    const html = renderEmail({
      siteUrl,
      title: "Your request is ready 🎉",
      preheader: "Your requested karaoke practice track is now available on SingWithPsalmy.",
      greeting: "Hello,",
      message: `The karaoke practice track you requested is now available:`,
      songTitle,
      artist,
      ctaLabel: "Open in SingWithPsalmy",
      ctaUrl: link,
      secondaryText: "Tip: Choose the version you prefer — Practice track / Performance version / Reduced vocals.",
      smallPrint: `You’re receiving this email because you requested “${escapeHtml(query)}”.`,
    });

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY is missing" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message || "Resend error", data },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function renderEmail(opts: {
  siteUrl: string;
  title: string;
  preheader: string;
  greeting: string;
  message: string;
  songTitle: string;
  artist?: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryText?: string;
  smallPrint?: string;
}) {
  const {
    siteUrl,
    title,
    preheader,
    greeting,
    message,
    songTitle,
    artist,
    ctaLabel,
    ctaUrl,
    secondaryText,
    smallPrint,
  } = opts;

  const safeSong = escapeHtml(songTitle);
  const safeArtist = artist ? escapeHtml(artist) : "";
  const dmcaUrl = `${siteUrl}/dmca`;
  const rightsUrl = `${siteUrl}/rights-holder`;

  // Premium dark theme (email-client friendly, table-based)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
  <style>
    /* Prevent auto-link styling on iOS */
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
  </style>
</head>
<body style="margin:0; padding:0; background:#07070a;">
  <!-- Preheader (hidden) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#07070a; padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%; max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="padding:14px 0 18px;">
              <div style="font-family:Arial, sans-serif; color:#ffffff; font-size:14px; letter-spacing:0.6px;">
                <span style="font-weight:700;">SingWithPsalmy</span>
                <span style="color:rgba(255,255,255,0.6);"> • Karaoke practice tracks</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#0f1016; border:1px solid rgba(255,255,255,0.10); border-radius:18px; padding:22px;">
              <div style="font-family:Arial, sans-serif; color:#ffffff; font-size:22px; font-weight:700; margin:0 0 10px;">
                ${escapeHtml(title)}
              </div>

              <div style="font-family:Arial, sans-serif; color:rgba(255,255,255,0.75); font-size:14px; line-height:1.6; margin:0 0 18px;">
                ${escapeHtml(greeting)}<br/>
                ${escapeHtml(message)}
              </div>

              <!-- Track pill -->
              <div style="margin:0 0 18px;">
                <div style="display:inline-block; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:999px; padding:10px 14px;">
                  <div style="font-family:Arial, sans-serif; color:#ffffff; font-size:14px; font-weight:700;">
                    ${safeSong}${safeArtist ? ` <span style="font-weight:400; color:rgba(255,255,255,0.65);">— ${safeArtist}</span>` : ""}
                  </div>
                </div>
              </div>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
                <tr>
                  <td>
                    <a href="${ctaUrl}"
                       style="display:inline-block; font-family:Arial, sans-serif; background:#ffffff; color:#000000; text-decoration:none; font-weight:700; font-size:14px; padding:12px 16px; border-radius:12px;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>

              <div style="font-family:Arial, sans-serif; color:rgba(255,255,255,0.65); font-size:12px; line-height:1.6; margin:0;">
                ${secondaryText ? escapeHtml(secondaryText) : ""}
              </div>

              <hr style="border:none; border-top:1px solid rgba(255,255,255,0.10); margin:18px 0;">

              <div style="font-family:Arial, sans-serif; color:rgba(255,255,255,0.65); font-size:12px; line-height:1.6;">
                Rights-holders & publishers: licensing, promotion, or concerns —
                <a href="${rightsUrl}" style="color:#ffffff; text-decoration:underline;">Rights-holder page</a>.
                <br/>
                DMCA takedown:
                <a href="${dmcaUrl}" style="color:#ffffff; text-decoration:underline;">DMCA page</a>.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 4px 0;">
              <div style="font-family:Arial, sans-serif; color:rgba(255,255,255,0.45); font-size:11px; line-height:1.6;">
                ${smallPrint ? smallPrint : ""}
                <br/>
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

function escapeHtml(input: string) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}