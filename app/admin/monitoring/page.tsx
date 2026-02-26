"use client";

import { useEffect, useState } from "react";

type Summary = {
  ok: boolean;
  now?: string;

  orders?: {
    last24h: { count: number; sum_kobo: number; currency: string };
    today: { count: number; sum_kobo: number; currency: string };
  };

  memberships?: { active_count: number; expired_count: number };

  membership_payments?: { last24h: { success: number; refunded: number } };

  emails?: { last24h: { count: number } };

  recent?: {
    orders: Array<any>;
    membership_payments: Array<any>;
    emails: Array<any>;
  };

  error?: string;
};

function fmtMoneyKobo(kobo: number, currency = "NGN") {
  const n = Number(kobo || 0) / 100;
  const cur = (currency || "NGN").toUpperCase();
  const symbol = cur === "NGN" ? "₦" : `${cur} `;
  return `${symbol}${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

export default function AdminMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);

    const res = await fetch("/api/admin/monitoring/summary", { cache: "no-store" });
    const out = (await res.json().catch(() => null)) as Summary | null;

    setLoading(false);

    if (!res.ok || !out?.ok) {
      setErr(out?.error || `Failed (HTTP ${res.status})`);
      setData(null);
      return;
    }

    setData(out);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/psalmy" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
              <span aria-hidden>←</span> Back to dashboard
            </a>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Analytics</h1>
            <p className="mt-2 text-sm text-white/65">
              Lightweight monitoring — sales, memberships, and email activity.
            </p>
          </div>

          <button
            onClick={load}
            className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="text-sm text-white/70">Loading…</div>
          </div>
        ) : err ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="text-sm">❌ {err}</div>
          </div>
        ) : (
          <>
            {/* Top cards */}
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Orders (last 24h)</div>
                <div className="mt-2 text-2xl font-semibold">{data?.orders?.last24h.count ?? 0}</div>
                <div className="mt-1 text-sm text-white/70">
                  {fmtMoneyKobo(data?.orders?.last24h.sum_kobo ?? 0, data?.orders?.last24h.currency || "NGN")}
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Orders (today)</div>
                <div className="mt-2 text-2xl font-semibold">{data?.orders?.today.count ?? 0}</div>
                <div className="mt-1 text-sm text-white/70">
                  {fmtMoneyKobo(data?.orders?.today.sum_kobo ?? 0, data?.orders?.today.currency || "NGN")}
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Memberships</div>
                <div className="mt-2 text-sm text-white/75">
                  Active: <span className="text-white">{data?.memberships?.active_count ?? 0}</span>
                </div>
                <div className="mt-1 text-sm text-white/75">
                  Expired: <span className="text-white">{data?.memberships?.expired_count ?? 0}</span>
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Emails (last 24h)</div>
                <div className="mt-2 text-2xl font-semibold">{data?.emails?.last24h.count ?? 0}</div>
                <div className="mt-1 text-xs text-white/55">From email_events</div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-lg font-semibold">Recent orders</div>
                <div className="mt-3 space-y-3">
                  {(data?.recent?.orders || []).slice(0, 10).map((o: any) => (
                    <div key={o.paystack_reference} className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                      <div className="text-xs text-white/60">{fmtDate(o.paid_at || o.created_at)}</div>
                      <div className="mt-1 text-sm font-semibold break-all">{o.paystack_reference}</div>
                      <div className="mt-1 text-xs text-white/70 break-all">{o.email || "—"}</div>
                      <div className="mt-1 text-xs text-white/70">
                        {fmtMoneyKobo(o.amount || 0, o.currency || "NGN")} • {o.status || "—"}
                      </div>
                    </div>
                  ))}
                  {(data?.recent?.orders || []).length === 0 ? (
                    <div className="text-sm text-white/60">No recent orders.</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-lg font-semibold">Recent membership payments</div>
                <div className="mt-3 space-y-3">
                  {(data?.recent?.membership_payments || []).slice(0, 10).map((m: any) => (
                    <div key={m.paystack_reference} className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                      <div className="text-xs text-white/60">{fmtDate(m.paid_at)}</div>
                      <div className="mt-1 text-sm font-semibold break-all">{m.paystack_reference}</div>
                      <div className="mt-1 text-xs text-white/70 break-all">{m.email || "—"}</div>
                      <div className="mt-1 text-xs text-white/70">
                        {m.plan || "—"} • {m.months || 0} mo • ₦{Number(m.amount || 0).toLocaleString("en-NG")} •{" "}
                        {m.status || "—"}
                      </div>
                    </div>
                  ))}
                  {(data?.recent?.membership_payments || []).length === 0 ? (
                    <div className="text-sm text-white/60">No recent membership payments.</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-lg font-semibold">Recent emails</div>
                <div className="mt-3 space-y-3">
                  {(data?.recent?.emails || []).slice(0, 10).map((e: any) => (
                    <div key={e.key} className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                      <div className="text-xs text-white/60">{fmtDate(e.created_at)}</div>
                      <div className="mt-1 text-sm font-semibold break-all">{e.kind || "email"}</div>
                      <div className="mt-1 text-xs text-white/70 break-all">{e.email || "—"}</div>
                      <div className="mt-1 text-xs text-white/50 break-all">{e.key || "—"}</div>
                    </div>
                  ))}
                  {(data?.recent?.emails || []).length === 0 ? (
                    <div className="text-sm text-white/60">No recent email events.</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs text-white/45">
              Updated: <span className="text-white/70">{fmtDate(data?.now || null)}</span>
            </div>
          </>
        )}
      </section>
    </main>
  );
}