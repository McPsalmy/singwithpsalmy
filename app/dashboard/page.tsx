"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

type OrderItem = {
  slug?: string;
  title?: string;
  version?: string;
};

type OrderRow = {
  paystack_reference: string;
  amount: number; // kobo
  currency: string;
  items: OrderItem[] | any;
  paid_at: string | null;
};

type OrdersResp = {
  ok: boolean;
  data?: OrderRow[];
  error?: string;
};

function fmt(iso?: string | null) {
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
    return iso;
  }
}

function fmtMoneyKobo(amountKobo?: number, currency?: string) {
  const n = Number(amountKobo || 0) / 100;
  const cur = (currency || "NGN").toUpperCase();
  const symbol = cur === "NGN" ? "₦" : `${cur} `;
  return `${symbol}${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function niceItem(i: OrderItem) {
  const title = (i?.title || i?.slug || "Track").toString();
  const v = (i?.version || "").toString();
  const suffix =
    v === "instrumental"
      ? " (Performance)"
      : v === "full-guide"
      ? " (Practice)"
      : v === "low-guide"
      ? " (Low guide)"
      : v
      ? ` (${v})`
      : "";
  return `${title}${suffix}`;
}

export default function DashboardPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [busyClear, setBusyClear] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setToast(null);

      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? null;

      if (!alive) return;
      setUserEmail(email);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      if (!token) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(false);

      // Orders history
      setOrdersLoading(true);
      setOrdersErr(null);

      const r2 = await fetch("/api/dashboard/orders", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const o2 = (await r2.json().catch(() => null)) as OrdersResp | null;

      if (!alive) return;

      setOrdersLoading(false);

      if (!r2.ok || !o2?.ok) {
        setOrdersErr(o2?.error || `Could not load purchases (HTTP ${r2.status}).`);
        setOrders([]);
        return;
      }

      setOrders(o2.data ?? []);
    }

    run();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const loggedIn = !!userEmail;

  async function clearHistory() {
    setToast(null);
    setOrdersErr(null);

    const ok = confirm(
      "Clear your purchase history?\n\nThis removes past purchases from your history.\nIt does NOT affect membership."
    );
    if (!ok) return;

    const ok2 = prompt("Type CLEAR to confirm") === "CLEAR";
    if (!ok2) {
      setToast("Cancelled.");
      return;
    }

    setBusyClear(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      if (!token) {
        setBusyClear(false);
        setToast("Please log in again.");
        return;
      }

      const res = await fetch("/api/dashboard/orders", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const out = await res.json().catch(() => ({}));

      setBusyClear(false);

      if (!res.ok || !out?.ok) {
        setToast(out?.error || `Failed (HTTP ${res.status})`);
        return;
      }

      setOrders([]);
      setToast("✅ Purchase history cleared.");
    } catch (e: any) {
      setBusyClear(false);
      setToast(e?.message || "Request failed.");
    }
  }

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/account" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
              <span aria-hidden>←</span> Back to account
            </a>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Purchase history</h1>
            <p className="mt-2 text-sm text-white/65">
              Your receipts and Paystack references — for your records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/browse"
              className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Browse songs
            </a>

            <button
              disabled={!loggedIn || busyClear || orders.length === 0}
              onClick={clearHistory}
              className={[
                "rounded-xl px-4 py-2 text-sm ring-1",
                !loggedIn || busyClear || orders.length === 0
                  ? "bg-white/10 text-white/60 ring-white/15 opacity-60"
                  : "bg-red-500/20 text-white ring-red-400/20 hover:bg-red-500/30",
              ].join(" ")}
              title={!loggedIn ? "Log in to manage history" : orders.length === 0 ? "Nothing to clear" : "Clear history"}
            >
              {busyClear ? "Working..." : "Clear history"}
            </button>
          </div>
        </div>

        {!loggedIn ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Log in to view your history</div>
            <p className="mt-2 text-sm text-white/65">
              Purchases are tied to your account email.
            </p>
            <a
              href="/signin"
              className="mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Log in
            </a>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
            {toast ? (
              <div className="mb-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                {toast}
              </div>
            ) : null}

            {loading || ordersLoading ? (
              <div className="text-sm text-white/70">Loading purchases…</div>
            ) : ordersErr ? (
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                ❌ {ordersErr}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-sm text-white/70">No purchases yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-white/60">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Items</th>
                      <th className="py-2 pr-4">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const itemsArr: OrderItem[] = Array.isArray(o.items) ? o.items : [];
                      return (
                        <tr key={o.paystack_reference} className="border-t border-white/10">
                          <td className="py-3 pr-4 whitespace-nowrap">{fmt(o.paid_at)}</td>
                          <td className="py-3 pr-4 whitespace-nowrap">{fmtMoneyKobo(o.amount, o.currency)}</td>
                          <td className="py-3 pr-4">
                            <div className="space-y-1">
                              {itemsArr.length === 0 ? (
                                <span className="text-white/60">—</span>
                              ) : (
                                itemsArr.slice(0, 4).map((it, idx) => (
                                  <div key={idx} className="text-white/85">
                                    • {niceItem(it)}
                                  </div>
                                ))
                              )}
                              {itemsArr.length > 4 ? (
                                <div className="text-xs text-white/60">+{itemsArr.length - 4} more</div>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-mono text-xs break-all text-white/85">
                              {o.paystack_reference}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <p className="mt-3 text-xs text-white/50">
                  Keep your Paystack reference safe. Recovery/download access is time-limited after purchase.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}