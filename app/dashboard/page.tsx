"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

type StatusResp = {
  ok: boolean;
  isMember?: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

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
  const [status, setStatus] = useState<StatusResp | null>(null);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [busyClear, setBusyClear] = useState(false);
  const [busyLogout, setBusyLogout] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setToast(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      // No session = logged out state
      if (!token) {
        if (!alive) return;
        setStatus({ ok: true, isMember: false });
        setOrders([]);
        setLoading(false);
        return;
      }

      // 1) Membership status (small pill + for non-member hint)
      const res = await fetch("/api/public/membership/status", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const out = (await res.json().catch(() => null)) as StatusResp | null;

      if (!alive) return;

      if (!res.ok || !out?.ok) {
        setStatus({ ok: false, error: out?.error || `Failed (HTTP ${res.status})` });
        setOrders([]);
        setLoading(false);
        return;
      }

      setStatus(out);
      setLoading(false);

      // 2) Orders history
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

  const loggedIn = !!status?.email;
  const isMember = !!status?.isMember;

  async function logout() {
    const ok = confirm("Log out of your account?");
    if (!ok) return;

    setBusyLogout(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setBusyLogout(false);
      window.location.href = "/";
    }
  }

  async function clearHistory() {
    setToast(null);
    setOrdersErr(null);

    const ok = confirm(
      "Clear your purchase history?\n\nThis removes past purchases from your dashboard.\nIt does NOT affect your membership."
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

  const membershipPill =
    !loggedIn
      ? { text: "Logged out", cls: "bg-white/10 text-white/80 ring-1 ring-white/15" }
      : loading
        ? { text: "Checking…", cls: "bg-white/10 text-white/80 ring-1 ring-white/15" }
        : status?.ok && isMember
          ? { text: "Member", cls: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20" }
          : status?.ok && !isMember
            ? { text: "Not a member", cls: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20" }
            : { text: "Status error", cls: "bg-white/10 text-white/80 ring-1 ring-white/15" };

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">Purchases</h1>
              <span className={`rounded-xl px-3 py-1 text-xs ${membershipPill.cls}`}>
                {membershipPill.text}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/65">Your paid track history and Paystack references.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/browse"
              className="inline-flex w-fit rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Browse songs
            </a>

            {!loggedIn ? (
              <a
                href="/signin"
                className="inline-flex w-fit rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Log in
              </a>
            ) : (
              <button
                onClick={logout}
                disabled={busyLogout}
                className={[
                  "inline-flex w-fit rounded-xl px-4 py-2 text-sm ring-1",
                  busyLogout
                    ? "bg-white/10 text-white/60 ring-white/15 opacity-60"
                    : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
                ].join(" ")}
                title={status?.email || "Log out"}
              >
                {busyLogout ? "Logging out..." : "Log out"}
              </button>
            )}
          </div>
        </div>

        {!loggedIn ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Log in to view purchases</div>
            <p className="mt-2 text-sm text-white/65">
              Your purchases are linked to your account email. Log in to see your history.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/signin"
                className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Log in
              </a>
              <a
                href="/signup"
                className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Create account
              </a>
              <a
                href="/recover"
                className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Recover with reference
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-semibold">Purchase history</div>
                <p className="mt-1 text-sm text-white/65">
                  Keep your Paystack reference safe. Recovery/download access is time-limited after purchase.
                </p>
              </div>

              <button
                disabled={busyClear || orders.length === 0}
                onClick={clearHistory}
                className={[
                  "rounded-xl px-4 py-2 text-sm ring-1",
                  busyClear || orders.length === 0
                    ? "bg-white/10 text-white/60 ring-white/15 opacity-60"
                    : "bg-red-500/20 text-white ring-red-400/20 hover:bg-red-500/30",
                ].join(" ")}
                title={orders.length === 0 ? "Nothing to clear" : "Clear your history"}
              >
                {busyClear ? "Working..." : "Clear history"}
              </button>
            </div>

            {toast ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                {toast}
              </div>
            ) : null}

            {ordersLoading ? (
              <div className="mt-4 text-sm text-white/70">Loading purchases…</div>
            ) : ordersErr ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                ❌ {ordersErr}
              </div>
            ) : orders.length === 0 ? (
              <div className="mt-4 text-sm text-white/70">No purchases yet.</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
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
                          <td className="py-3 pr-4 whitespace-nowrap">
                            {fmtMoneyKobo(o.amount, o.currency)}
                          </td>
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
                  Note: recovery/download access is time-limited after purchase. Always keep your reference safe.
                </p>
              </div>
            )}

            {/* Subtle membership ad for non-members */}
            {!isMember ? (
              <div className="mt-6 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Want instant downloads?</div>
                <p className="mt-1 text-sm text-white/65">
                  Join membership to unlock direct downloads and skip checkout — recognized automatically when you log
                  in with this email.
                </p>
                <a
                  href="/membership"
                  className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                >
                  View membership plans
                </a>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}