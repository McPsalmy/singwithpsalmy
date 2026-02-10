import { NextResponse } from "next/server";

type CartItem = {
  slug: string;
  title: string;
  version: "full-guide" | "instrumental" | "low-guide";
};

const PRICE_PER_ITEM_NAIRA = 700;

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; // e.g. http://localhost:3000

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

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    // Either single item OR cart items
    const items = (body?.items || null) as CartItem[] | null;

    let amountNaira = 0;
    let metadata: any = { source: "singwithpsalmy" };

    if (Array.isArray(items) && items.length > 0) {
      // CART FLOW
      amountNaira = items.length * PRICE_PER_ITEM_NAIRA;

      metadata = {
        ...metadata,
        kind: "cart",
        amountNaira,
        pricePerItem: PRICE_PER_ITEM_NAIRA,
        items,
      };
    } else {
      // SINGLE ITEM FLOW (backward compatible)
      const singleAmount = Number(body?.amountNaira || 0);
      const slug = String(body?.slug || "").trim();
      const title = String(body?.title || "").trim();
      const version = String(body?.version || "").trim();

      if (!singleAmount || singleAmount < 1) {
        return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 });
      }
      if (!slug || !version) {
        return NextResponse.json(
          { ok: false, error: "Missing slug or version" },
          { status: 400 }
        );
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

    // Paystack amount is in kobo
    const amountKobo = Math.round(amountNaira * 100);

    // Where Paystack should redirect after payment
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
