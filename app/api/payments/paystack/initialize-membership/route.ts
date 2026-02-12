import { NextResponse } from "next/server";

const PLANS: Record<string, { months: number; amountNaira: number }> = {
  bronze: { months: 1, amountNaira: 20000 },
  silver: { months: 3, amountNaira: 45000 },
  gold: { months: 6, amountNaira: 60000 },
  platinum: { months: 12, amountNaira: 90000 },
};

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Missing PAYSTACK_SECRET_KEY" },
        { status: 500 }
      );
    }
    if (!siteUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const planRaw = String(body?.plan || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }
    if (!planRaw || !PLANS[planRaw]) {
      return NextResponse.json(
        { ok: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    const plan = planRaw;
    const { months, amountNaira } = PLANS[plan];

    const metadata = {
      source: "singwithpsalmy",
      kind: "membership",
      membership: {
        plan,
        months,
        amountNaira,
        email,
      },
    };

    const amountKobo = Math.round(amountNaira * 100);
    const callback_url = `${siteUrl}/paystack/callback`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        callback_url,
        metadata,
      }),
    });

    const outText = await res.text();
    let out: any = null;
    try {
      out = JSON.parse(outText);
    } catch {
      out = { message: outText };
    }

    if (!res.ok || !out?.status) {
      return NextResponse.json(
        {
          ok: false,
          error:
            out?.message ||
            out?.error ||
            `Paystack init failed (HTTP ${res.status})`,
          status: res.status,
          raw: out,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorization_url: out.data.authorization_url,
      reference: out.data.reference,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
