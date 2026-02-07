import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body?.email || "").trim();
    const songTitle = String(body?.songTitle || "").trim();
    const artist = String(body?.artist || "").trim();

    if (!email || !songTitle) {
      return NextResponse.json(
        { ok: false, error: "Missing email or songTitle" },
        { status: 400 }
      );
    }

    // Use local during dev, otherwise your domain later
    const siteUrl = process.env.SITE_URL || "http://localhost:3000";

    // Always link to browse search using the song title (simple + reliable)
    const link = `${siteUrl}/browse?query=${encodeURIComponent(songTitle)}`;

    const subject = `Now available on SingWithPsalmy: ${songTitle}`;
    const from = "SingWithPsalmy <onboarding@resend.dev>"; // later switch to support@singwithpsalmy.com after domain verification

    const html = `
      <div style="font-family:Arial,sans-serif; line-height:1.6; color:#111;">
        <h2 style="margin:0 0 10px;">Your request is ready 🎉</h2>

        <p style="margin:0 0 12px;">
          The karaoke practice tracks you requested are now available on SingWithPsalmy:
          <strong>${escapeHtml(songTitle)}</strong>${artist ? ` — <span>${escapeHtml(artist)}</span>` : ""}.
        </p>

        <p style="margin:0 0 14px;">
          Open the catalogue here:
          <a href="${link}">${link}</a>
        </p>

        <p style="margin:0 0 14px;">
          Tip: You can download the version you prefer (Practice track / Performance version / Reduced vocals).
        </p>

        <p style="margin:0 0 14px;">
          Happy practicing — sing your heart out!
        </p>

        <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;" />

        <p style="font-size:12px; color:#555; margin:0;">
          Rights-holders & publishers: for promotion, licensing, or concerns, please reach us via the Rights-holder page on our website.
        </p>
      </div>
    `;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY is missing" },
        { status: 500 }
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
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message || "Resend error", data },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
