import { createClient } from "@supabase/supabase-js";
import { getClientIp, noStoreJson, rateLimit } from "../../../../lib/security";

const MAX_MINUTES = 30;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return noStoreJson({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    const url = new URL(req.url);
    const reference = String(url.searchParams.get("reference") || "").trim();
    if (!reference) {
      return noStoreJson({ ok: false, error: "Missing reference" }, { status: 400 });
    }

    // Light rate limit: prevents brute-force reference guessing
    const ip = getClientIp(req);
    const rl = rateLimit({
      key: `orders_get:${ip}`,
      limit: 30, // 30 requests per 5 minutes per IP
      windowMs: 5 * 60 * 1000,
    });
    if (!rl.ok) {
      return noStoreJson(
        { ok: false, error: "Too many attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const rl2 = rateLimit({
      key: `orders_get_ref:${ip}:${reference}`,
      limit: 10, // 10 attempts per reference per 10 minutes per IP
      windowMs: 10 * 60 * 1000,
    });
    if (!rl2.ok) {
      return noStoreJson(
        { ok: false, error: "Too many attempts for this reference. Please try again later." },
        { status: 429 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("orders")
      .select("paystack_reference,email,amount,currency,items,paid_at,created_at,status")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (error) {
      return noStoreJson(
        { ok: false, error: error.message || "Could not load order" },
        { status: 500 }
      );
    }

    if (!data) {
      // Return 404 without leaking too much detail
      return noStoreJson({ ok: false, error: "Order not found." }, { status: 404 });
    }

    if (data.status !== "paid") {
      return noStoreJson({ ok: false, error: `Order not paid: ${data.status}` }, { status: 403 });
    }

    const paidAtIso = data.paid_at || data.created_at;
    const paidAtMs = paidAtIso ? new Date(paidAtIso).getTime() : 0;

    if (!paidAtMs) {
      return noStoreJson({ ok: false, error: "Missing paid_at timestamp" }, { status: 401 });
    }

    if (Date.now() - paidAtMs > MAX_MINUTES * 60 * 1000) {
      return noStoreJson(
        { ok: false, error: `Recovery window expired (${MAX_MINUTES} minutes).` },
        { status: 403 }
      );
    }

    return noStoreJson({
      ok: true,
      reference: data.paystack_reference,
      email: data.email,
      amount: data.amount,
      currency: data.currency,
      items: data.items || [],
      paid_at: data.paid_at,
      created_at: data.created_at,
      window_minutes: MAX_MINUTES,
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}