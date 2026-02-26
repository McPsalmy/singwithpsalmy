import { createClient } from "@supabase/supabase-js";
import { noStoreJson } from "../../../../lib/security";

export const dynamic = "force-dynamic";

function startOfDayUTC(d = new Date()) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  return x.toISOString();
}

function sinceHoursUTC(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return noStoreJson({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const nowIso = new Date().toISOString();
    const since24h = sinceHoursUTC(24);
    const today0 = startOfDayUTC();

    // Orders (paid only) — count + sum for 24h and today
    const orders24 = await supabase
      .from("orders")
      .select("amount,paid_at,created_at,status")
      .eq("status", "paid")
      .or(`paid_at.gte.${since24h},and(paid_at.is.null,created_at.gte.${since24h})`);

    const ordersToday = await supabase
      .from("orders")
      .select("amount,paid_at,created_at,status")
      .eq("status", "paid")
      .or(`paid_at.gte.${today0},and(paid_at.is.null,created_at.gte.${today0})`);

    // Membership payments (ledger)
    const mp24 = await supabase
      .from("membership_payments")
      .select("status,paid_at")
      .gte("paid_at", since24h);

    // Memberships snapshot
    const activeMem = await supabase
      .from("memberships")
      .select("email", { count: "exact", head: true })
      .eq("status", "active");

    const expiredMem = await supabase
      .from("memberships")
      .select("email", { count: "exact", head: true })
      .eq("status", "expired");

    // Emails sent (email_events)
    const emails24 = await supabase
      .from("email_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h);

    // Recent activity (simple, lightweight lists)
    const recentOrders = await supabase
      .from("orders")
      .select("paystack_reference,email,amount,currency,status,paid_at,created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const recentMp = await supabase
      .from("membership_payments")
      .select("paystack_reference,email,plan,months,amount,currency,status,paid_at")
      .order("paid_at", { ascending: false })
      .limit(20);

    const recentEmails = await supabase
      .from("email_events")
      .select("key,email,kind,created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (orders24.error) return noStoreJson({ ok: false, error: orders24.error.message }, { status: 500 });
    if (ordersToday.error) return noStoreJson({ ok: false, error: ordersToday.error.message }, { status: 500 });
    if (mp24.error) return noStoreJson({ ok: false, error: mp24.error.message }, { status: 500 });
    if (activeMem.error) return noStoreJson({ ok: false, error: activeMem.error.message }, { status: 500 });
    if (expiredMem.error) return noStoreJson({ ok: false, error: expiredMem.error.message }, { status: 500 });
    if (emails24.error) return noStoreJson({ ok: false, error: emails24.error.message }, { status: 500 });
    if (recentOrders.error) return noStoreJson({ ok: false, error: recentOrders.error.message }, { status: 500 });
    if (recentMp.error) return noStoreJson({ ok: false, error: recentMp.error.message }, { status: 500 });
    if (recentEmails.error) return noStoreJson({ ok: false, error: recentEmails.error.message }, { status: 500 });

    const sumKobo = (rows: any[]) => rows.reduce((acc, r) => acc + Number(r?.amount || 0), 0);

    const orders24Count = orders24.data?.length || 0;
    const ordersTodayCount = ordersToday.data?.length || 0;

    const orders24SumKobo = sumKobo(orders24.data || []);
    const ordersTodaySumKobo = sumKobo(ordersToday.data || []);

    const mp24Success = (mp24.data || []).filter((r: any) => r.status === "success").length;
    const mp24Refunded = (mp24.data || []).filter((r: any) => r.status === "refunded").length;

    return noStoreJson({
      ok: true,
      now: nowIso,
      windows: { since24h, today0 },

      orders: {
        last24h: { count: orders24Count, sum_kobo: orders24SumKobo, currency: "NGN" },
        today: { count: ordersTodayCount, sum_kobo: ordersTodaySumKobo, currency: "NGN" },
      },

      memberships: {
        active_count: activeMem.count ?? 0,
        expired_count: expiredMem.count ?? 0,
      },

      membership_payments: {
        last24h: { success: mp24Success, refunded: mp24Refunded },
      },

      emails: {
        last24h: { count: emails24.count ?? 0 },
      },

      recent: {
        orders: recentOrders.data || [],
        membership_payments: recentMp.data || [],
        emails: recentEmails.data || [],
      },
    });
  } catch (e: any) {
    return noStoreJson({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}