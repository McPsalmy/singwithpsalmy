import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VersionKey = "full-guide" | "instrumental" | "low-guide";

function normalizeVersion(v: unknown): VersionKey {
  const val = Array.isArray(v) ? v[0] : v;
  if (val === "full-guide" || val === "instrumental" || val === "low-guide") return val;
  return "instrumental";
}

type PaystackItem = {
  slug: string;
  title?: string;
  version: VersionKey;
};

export async function GET(req: Request) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ ok: false, error: "Missing PAYSTACK_SECRET_KEY" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    if (!siteUrl) {
      return NextResponse.json({ ok: false, error: "Missing NEXT_PUBLIC_SITE_URL" }, { status: 500 });
    }

    const url = new URL(req.url);
    const slug = String(url.searchParams.get("slug") || "").trim();
    const v = normalizeVersion(url.searchParams.get("v"));
    const ref = String(url.searchParams.get("ref") || "").trim();

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }
    if (!ref) {
      return NextResponse.json({ ok: false, error: "Missing payment reference" }, { status: 400 });
    }

    // 1) Verify payment with Paystack (server-side)
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${paystackSecret}` },
      }
    );

    const verifyOut = await verifyRes.json().catch(() => null);

    if (!verifyRes.ok || !verifyOut?.status) {
      return NextResponse.json(
        { ok: false, error: verifyOut?.message || `Verify failed (HTTP ${verifyRes.status})` },
        { status: 401 }
      );
    }

    const data = verifyOut.data;

    if (data?.status !== "success") {
      return NextResponse.json(
        { ok: false, error: `Payment not successful: ${data?.status || "unknown"}` },
        { status: 401 }
      );
    }

    // 30-minute download window
    const MAX_MINUTES = 30;
    const paidAtMs = data?.paid_at ? new Date(data.paid_at).getTime() : 0;

    if (!paidAtMs) {
      return NextResponse.json({ ok: false, error: "Missing paid_at timestamp" }, { status: 401 });
    }

    if (Date.now() - paidAtMs > MAX_MINUTES * 60 * 1000) {
      return NextResponse.json(
        { ok: false, error: `Download window expired (${MAX_MINUTES} minutes).` },
        { status: 403 }
      );
    }

    // 2) Confirm this slug+version was in the paid cart items
    const metadata = data?.metadata || {};
    const items = (metadata?.items || []) as PaystackItem[];

    const allowed = Array.isArray(items)
      ? items.some((it) => it?.slug === slug && it?.version === v)
      : false;

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "This item was not included in the paid order." },
        { status: 403 }
      );
    }

    // Best-effort: increment downloads (cookie-based spam protection)
    fetch(`${siteUrl}/api/public/tracks/increment-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      cache: "no-store",
    }).catch(() => {});

    // 3) Stream the file through this route with forced download headers
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const bucket = "media";
    const path = `full/${slug}-${v}-full.mp4`;

    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: signErr?.message || "Could not create signed URL" },
        { status: 500 }
      );
    }

    const upstream = await fetch(signed.signedUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { ok: false, error: `Upstream fetch failed (HTTP ${upstream.status})` },
        { status: 502 }
      );
    }

    const filename = `${slug}-${v}-full.mp4`;

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
