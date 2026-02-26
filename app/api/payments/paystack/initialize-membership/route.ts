import { noStoreJson, enforceSameOriginForMutations, getClientIp, rateLimit } from "../../../../lib/security";

const PLANS: Record<string, { months: number; amountNaira: number }> = {
  bronze: { months: 1, amountNaira: 20000 },
  silver: { months: 3, amountNaira: 45000 },
  gold: { months: 6, amountNaira: 60000 },
  platinum: { months: 12, amountNaira: 90000 },
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // ✅ Same-origin / CSRF-style protection (matches your cart init)
    const sameOrigin = enforceSameOriginForMutations(req);
    if (!sameOrigin.ok) {
      return noStoreJson({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!secret) return noStoreJson({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
    if (!siteUrl) return noStoreJson({ ok: false, error: "Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 });

    // ✅ Rate limit by IP (prevents bots spamming init)
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `pay_init_mem:${ip}`, limit: 30, windowMs: 5 * 60 * 1000 });
    if (!rl.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const planRaw = String(body?.plan || "").trim().toLowerCase();

    if (!email) return noStoreJson({ ok: false, error: "Missing email" }, { status: 400 });
    if (!planRaw || !PLANS[planRaw]) return noStoreJson({ ok: false, error: "Invalid plan" }, { status: 400 });

    // ✅ Rate limit by email (prevents targeted spam)
    const rl2 = rateLimit({
      key: `pay_init_mem_email:${email.toLowerCase()}`,
      limit: 15,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl2.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts for this email. Try again later." }, { status: 429 });
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
    const callback_url = `${siteUrl.replace(/\/+$/, "")}/paystack/callback`;

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
      return noStoreJson(
        {
          ok: false,
          error: out?.message || out?.error || `Paystack init failed (HTTP ${res.status})`,
          status: res.status,
          raw: out,
        },
        { status: 500 }
      );
    }

    return noStoreJson({
      ok: true,
      authorization_url: out.data.authorization_url,
      reference: out.data.reference,
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}