"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import AdminGate from "../../components/AdminGate";

type MembershipRow = {
  email: string;
  plan: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
};

type ListResp = {
  ok: boolean;
  error?: string;
  counts?: { active: number; expired: number; total: number };
  data?: MembershipRow[];
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

export default function AdminMembershipsPage() {
  // refund tool
  const [ref, setRef] = useState("");
  const [busyRefund, setBusyRefund] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // list
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [rows, setRows] = useState<MembershipRow[]>([]);
  const [counts, setCounts] = useState<{ active: number; expired: number; total: number }>({
    active: 0,
    expired: 0,
    total: 0,
  });

  async function load() {
    setLoading(true);
    setLoadErr(null);

    try {
      const res = await fetch("/api/admin/memberships/list", { cache: "no-store" });
      const out = (await res.json().catch(() => ({}))) as ListResp;

      setLoading(false);

      if (!res.ok || !out?.ok) {
        setLoadErr(out?.error || `Failed (HTTP ${res.status})`);
        setRows([]);
        setCounts({ active: 0, expired: 0, total: 0 });
        return;
      }

      setRows(out.data ?? []);
      setCounts(out.counts ?? { active: 0, expired: 0, total: 0 });
    } catch (e: any) {
      setLoading(false);
      setLoadErr(e?.message || "Could not reach server.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRefund() {
    setMsg(null);
    const reference = ref.trim();
    if (!reference) {
      setMsg("Please paste a Paystack reference.");
      return;
    }

    const ok = confirm(
      `Mark this membership payment as REFUNDED and recompute expiry?\n\nReference: ${reference}`
    );
    if (!ok) return;

    setBusyRefund(true);
    try {
      const res = await fetch("/api/admin/memberships/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      const out = await res.json().catch(() => ({}));
      setBusyRefund(false);

      if (!res.ok || !out?.ok) {
        console.error(out);
        setMsg(out?.error || `Failed (HTTP ${res.status})`);
        return;
      }

      setMsg(
        `✅ Updated: ${out.email} → ${out.status}${
          out.expires_at ? ` (expires ${fmt(out.expires_at)})` : ""
        }`
      );

      // reload list + counts after refund
      load();
    } catch (e: any) {
      setBusyRefund(false);
      setMsg(e?.message || "Request failed.");
    }
  }

  const tableRows = useMemo(() => rows, [rows]);

  return (
    <AdminGate>
      <main className="min-h-screen text-white">
        <SiteHeader />

        <section className="mx-auto max-w-5xl px-5 py-12">
            <a
  href="/psalmy"
  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 hover:bg-white/15"
>
  ← Back to dashboard
</a>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Subscribers</h1>
              <p className="mt-2 text-sm text-white/65">
                View membership status, counts, and handle refunds by Paystack reference.
              </p>
            </div>

            <button
              onClick={load}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Refresh
            </button>
          </div>

          {/* counts */}
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Active</div>
              <div className="mt-1 text-2xl font-semibold">{counts.active}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Expired</div>
              <div className="mt-1 text-2xl font-semibold">{counts.expired}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Total</div>
              <div className="mt-1 text-2xl font-semibold">{counts.total}</div>
            </div>
          </div>

          {/* refund tool */}
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Refund tool</div>
            <p className="mt-1 text-sm text-white/65">
              Paste a membership Paystack reference to mark it refunded and recompute expiry.
            </p>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Paystack reference..."
                className="w-full rounded-xl bg-black/40 px-4 py-3 text-sm text-white ring-1 ring-white/15 outline-none focus:ring-2"
              />
              <button
                disabled={busyRefund}
                onClick={submitRefund}
                className={[
                  "rounded-xl px-4 py-3 text-sm font-semibold",
                  busyRefund
                    ? "bg-white/10 opacity-60"
                    : "bg-red-500/20 hover:bg-red-500/30",
                ].join(" ")}
              >
                {busyRefund ? "Working..." : "Mark refunded"}
              </button>
            </div>

            {msg ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                {msg}
              </div>
            ) : null}
          </div>

          {/* list */}
          <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Membership list</div>
            <p className="mt-1 text-sm text-white/65">
              Shows the current membership row per email (your “source of truth”).
            </p>

            {loading ? (
              <div className="mt-4 text-sm text-white/70">Loading…</div>
            ) : loadErr ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                ❌ {loadErr}
              </div>
            ) : tableRows.length === 0 ? (
              <div className="mt-4 text-sm text-white/70">No memberships found.</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-white/60">
                    <tr>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Plan</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Started</th>
                      <th className="py-2 pr-4">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={r.email} className="border-t border-white/10">
                        <td className="py-3 pr-4">{r.email}</td>
                        <td className="py-3 pr-4">{r.plan ?? "—"}</td>
                        <td className="py-3 pr-4">{r.status ?? "—"}</td>
                        <td className="py-3 pr-4">{fmt(r.started_at)}</td>
                        <td className="py-3 pr-4">{fmt(r.expires_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminGate>
  );
}
