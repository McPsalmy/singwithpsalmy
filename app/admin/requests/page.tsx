"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGate from "../../components/AdminGate";

type RequestItem = {
  id: string;
  email: string;
  songTitle: string;
  artist?: string;
  notes?: string;
  status?: "open" | "fulfilled" | "archived";
  createdAt: string;
  fulfilledAt?: string | null;
  archivedAt?: string | null;
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-NG", {
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

export default function AdminRequestsPage() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/requests", { cache: "no-store" });
      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok) {
        console.error(out);
        alert("Could not load requests.");
        return;
      }

      const mapped: RequestItem[] = (out.data ?? []).map((r: any) => ({
        id: r.id,
        email: r.email,
        songTitle: r.song_title,
        artist: r.artist ?? "",
        notes: r.notes ?? "",
        status: (r.status ?? "open") as "open" | "fulfilled" | "archived",
        createdAt: r.created_at,
        fulfilledAt: r.fulfilled_at ?? null,
        archivedAt: r.archived_at ?? null,
      }));

      setItems(mapped);
    } catch (e) {
      console.error(e);
      alert("Could not load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const open = items.filter((x) => (x.status ?? "open") === "open").length;
    const fulfilled = items.filter((x) => x.status === "fulfilled").length;
    const archived = items.filter((x) => x.status === "archived").length;
    const treated = fulfilled + archived;
    return { open, fulfilled, archived, treated, total: items.length };
  }, [items]);

  const visibleItems = useMemo(() => {
    return showArchived ? items : items.filter((x) => x.status !== "archived");
  }, [items, showArchived]);

  async function setStatus(idx: number, status: "open" | "fulfilled" | "archived") {
    const item = visibleItems[idx];
    if (!item?.id) return;

    setBusyId(item.id);

    const res = await fetch("/api/admin/requests/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) {
      console.error(out);
      alert("Could not update status.");
      setBusyId(null);
      return;
    }

    // If fulfilled, send email
    if (status === "fulfilled") {
      const r2 = await fetch("/api/notify-fulfilled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: item.email,
          songTitle: item.songTitle,
          artist: item.artist || "",
        }),
      });

      const out2 = await r2.json().catch(() => ({}));
      if (!r2.ok || !out2?.ok) {
        console.error(out2);
        alert("Marked fulfilled, but email failed to send. Check console.");
      } else {
        setToast("Marked as fulfilled ✓ Email sent");
        setTimeout(() => setToast(null), 1400);
      }
    } else if (status === "archived") {
      setToast("Archived ✓");
      setTimeout(() => setToast(null), 1200);
    } else {
      setToast("Reopened ✓");
      setTimeout(() => setToast(null), 1200);
    }

    setBusyId(null);
    load();
  }

  function clearAll() {
    alert("Clear all is disabled for safety. (We can add Archive Fulfilled instead.)");
  }

  return (
    <AdminGate>
      <main className="min-h-screen text-white">
        
        <section className="mx-auto max-w-6xl px-5 py-12">
          <a
  href="/psalmy"
  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 hover:bg-white/15"
>
  ← Back to dashboard
</a>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Admin: Requests</h1>
              <p className="mt-2 text-sm text-white/65">
                Open: <span className="text-white">{counts.open}</span> · Fulfilled:{" "}
                <span className="text-white">{counts.fulfilled}</span> · Archived:{" "}
                <span className="text-white">{counts.archived}</span> · Treated:{" "}
                <span className="text-white">{counts.treated}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className={[
                  "rounded-xl px-4 py-2 text-sm ring-1 ring-white/15",
                  loading ? "bg-white/10 opacity-60" : "bg-white/10 hover:bg-white/15",
                ].join(" ")}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={() => setShowArchived((v) => !v)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                {showArchived ? "Hide archived" : "View archived"}
              </button>

              <button
                onClick={clearAll}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Clear all
              </button>
            </div>
          </div>

          {toast && (
            <div className="mt-4">
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
                <span>✅</span>
                <span>{toast}</span>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-3">
            {visibleItems.length === 0 ? (
              <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
                <div className="text-lg font-semibold">
                  {showArchived ? "No archived requests" : "No requests yet"}
                </div>
                <p className="mt-2 text-sm text-white/65">
                  {showArchived
                    ? "Archive fulfilled requests to keep your dashboard clean."
                    : "Submit a request from the Song Request page to see it here."}
                </p>
              </div>
            ) : (
              visibleItems.map((r, idx) => {
                const status = r.status ?? "open";
                const busy = busyId === r.id;

                return (
                  <div key={r.id} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs text-white/60">{fmtDate(r.createdAt)}</div>

                        <div className="mt-1 text-lg font-semibold">
                          {r.songTitle || "(Untitled)"}{" "}
                          {r.artist ? (
                            <span className="text-sm font-normal text-white/60">— {r.artist}</span>
                          ) : null}
                        </div>

                        <div className="mt-1 text-sm text-white/70">
                          Requester email: <span className="text-white">{r.email}</span>
                        </div>

                        {r.notes ? (
                          <div className="mt-3 rounded-2xl bg-black/30 p-4 text-sm text-white/70 ring-1 ring-white/10">
                            {r.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs ring-1",
                            status === "fulfilled"
                              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                              : status === "archived"
                              ? "bg-white/10 text-white/70 ring-white/15"
                              : "bg-white/10 text-white/70 ring-white/15",
                          ].join(" ")}
                        >
                          {status === "fulfilled" ? "Fulfilled" : status === "archived" ? "Archived" : "Open"}
                        </span>

                        {status === "open" ? (
                          <button
                            disabled={busy}
                            onClick={() => setStatus(idx, "fulfilled")}
                            className={[
                              "rounded-xl px-4 py-2 text-sm font-semibold",
                              busy ? "bg-white/60 text-black" : "bg-white text-black hover:bg-white/90",
                            ].join(" ")}
                          >
                            {busy ? "Working..." : "Mark fulfilled"}
                          </button>
                        ) : status === "fulfilled" ? (
                          <>
                            <button
                              disabled={busy}
                              onClick={() => setStatus(idx, "archived")}
                              className={[
                                "rounded-xl px-4 py-2 text-sm font-semibold",
                                busy ? "bg-white/10 text-white/60" : "bg-white/10 hover:bg-white/15",
                              ].join(" ")}
                            >
                              {busy ? "Working..." : "Archive"}
                            </button>

                            <button
                              disabled={busy}
                              onClick={() => setStatus(idx, "open")}
                              className={[
                                "rounded-xl px-4 py-2 text-sm ring-1 ring-white/15",
                                busy ? "bg-white/10 text-white/60" : "bg-white/10 hover:bg-white/15",
                              ].join(" ")}
                            >
                              {busy ? "Working..." : "Reopen"}
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={busy}
                            onClick={() => setStatus(idx, "open")}
                            className={[
                              "rounded-xl px-4 py-2 text-sm ring-1 ring-white/15",
                              busy ? "bg-white/10 text-white/60" : "bg-white/10 hover:bg-white/15",
                            ].join(" ")}
                          >
                            {busy ? "Working..." : "Unarchive"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p className="mt-8 text-xs text-white/50">
            “Mark fulfilled” updates the database securely and sends an email to the requester. Archive keeps the dashboard clean.
          </p>
        </section>
      </main>
    </AdminGate>
  );
}
