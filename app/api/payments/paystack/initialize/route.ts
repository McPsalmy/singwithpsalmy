import { NextResponse } from "next/server";
import { enforceSameOriginForMutations, getClientIp, noStoreJson, rateLimit } from "../../../../lib/security";

type CartItem = {
  slug: string;
  title: string;
  version: "full-guide" | "instrumental" | "low-guide";
};

const PRICE_PER_ITEM_NAIRA = 700;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const sameOrigin = enforceSameOriginForMutations(req);
    if (!sameOrigin.ok) {
      return noStoreJson({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!secret) return noStoreJson({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
    if (!siteUrl) return noStoreJson({ ok: false, error: "Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 });

    const ip = getClientIp(req);
    const rl = rateLimit({ key: `pay_init:${ip}`, limit: 40, windowMs: 5 * 60 * 1000 });
    if (!rl.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();

    if (!email) return noStoreJson({ ok: false, error: "Missing email" }, { status: 400 });

    const rl2 = rateLimit({ key: `pay_init_email:${email.toLowerCase()}`, limit: 20, windowMs: 10 * 60 * 1000 });
    if (!rl2.ok) {
      return noStoreJson({ ok: false, error: "Too many attempts for this email. Try again later." }, { status: 429 });
    }

    // Either cart items OR single item
    const items = (body?.items || null) as CartItem[] | null;

    let amountNaira = 0;
    let metadata: any = { source: "singwithpsalmy" };

    if (Array.isArray(items) && items.length > 0) {
      amountNaira = items.length * PRICE_PER_ITEM_NAIRA;
      metadata = {
        ...metadata,
        kind: "cart",
        amountNaira,
        pricePerItem: PRICE_PER_ITEM_NAIRA,
        items,
      };
    } else {
      const singleAmount = Number(body?.amountNaira || 0);
      const slug = String(body?.slug || "").trim();
      const title = String(body?.title || "").trim();
      const version = String(body?.version || "").trim();

      if (!singleAmount || singleAmount < 1) {
        return noStoreJson({ ok: false, error: "Invalid amount" }, { status: 400 });
      }
      if (!slug || !version) {
        return noStoreJson({ ok: false, error: "Missing slug or version" }, { status: 400 });
      }

      amountNaira = singleAmount;

      metadata = {
        ...metadata,
        kind: "single",
        slug,
        title,
        version,
        amountNaira,
      };
    }

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