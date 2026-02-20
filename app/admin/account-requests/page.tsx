"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGate from "../../components/AdminGate";

type Item = {
  id: string;
  email: string;
  reason?: string | null;
  status?: "open" | "processed" | "archived";
  createdAt: string;
  processedAt?: string | null;
  notes?: string | null;
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

export default function AdminAccountRequestsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // notes draft per row
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/account-requests", { cache: "no-store" });
      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok) {
        console.error(out);
        alert("Could not load account delete requests.");
        return;
      }

      const mapped: Item[] = (out.data ?? []).map((r: any) => ({
        id: r.id,
        email: r.email,
        reason: r.reason ?? null,
        status: (r.status ?? "open") as "open" | "processed" | "archived",
        createdAt: r.created_at,
        processedAt: r.processed_at ?? null,
        notes: r.processed_notes ?? null,
      }));

      setItems(mapped);

      // seed drafts if missing
      setNotesDraft((prev) => {
        const next = { ...prev };
        for (const it of mapped) {
          if (next[it.id] === undefined) next[it.id] = String(it.notes ?? "");
        }
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Could not load account delete requests.");
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
    const processed = items.filter((x) => x.status === "processed").length;
    const archived = items.filter((x) => x.status === "archived").length;
    const treated = processed + archived;
    return { open, processed, archived, treated, total: items.length };
  }, [items]);

  const visibleItems = useMemo(() => {
    return showArchived ? items : items.filter((x) => x.status !== "archived");
  }, [items, showArchived]);

  async function setStatus(idx: number, status: "open" | "processed" | "archived") {
    const item = visibleItems[idx];
    if (!item?.id) return;

    setBusyId(item.id);

    const notes = notesDraft[item.id] ?? "";

    const res = await fetch("/api/admin/account-requests/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status, notes }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) {
      console.error(out);
      alert("Could not update status.");
      setBusyId(null);
      return;
    }

    if (status === "processed") {
      setToast("Marked processed ✓");
      setTimeout(() => setToast(null), 1200);
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

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Admin: Account delete requests</h1>
              <p className="mt-2 text-sm text-white/65">
                Open: <span className="text-white">{counts.open}</span> · Processed:{" "}
                <span className="text-white">{counts.processed}</span> · Archived:{" "}
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
                  {showArchived ? "No archived delete requests" : "No delete requests yet"}
                </div>
                <p className="mt-2 text-sm text-white/65">
                  Users can submit delete requests from the Account page.
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

                        <div className="mt-1 text-lg font-semibold break-all">{r.email}</div>

                        {r.reason ? (
                          <div className="mt-3 rounded-2xl bg-black/30 p-4 text-sm text-white/70 ring-1 ring-white/10">
                            <div className="text-xs text-white/60 mb-2">Reason</div>
                            {r.reason}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-white/60">No reason provided.</div>
                        )}

                        <div className="mt-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                          <div className="text-xs text-white/60">Internal notes (optional)</div>
                          <textarea
                            value={notesDraft[r.id] ?? ""}
                            onChange={(e) =>
                              setNotesDraft((p) => ({ ...p, [r.id]: e.target.value }))
                            }
                            className="mt-2 min-h-[72px] w-full resize-y rounded-xl bg-black/20 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/40"
                            placeholder="Example: Verified ownership, deleted auth user, anonymized orders email."
                            maxLength={2000}
                          />
                          {r.processedAt ? (
                            <div className="mt-2 text-xs text-white/55">
                              Processed at: <span className="text-white">{fmtDate(r.processedAt)}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs ring-1",
                            status === "processed"
                              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                              : status === "archived"
                              ? "bg-white/10 text-white/70 ring-white/15"
                              : "bg-white/10 text-white/70 ring-white/15",
                          ].join(" ")}
                        >
                          {status === "processed" ? "Processed" : status === "archived" ? "Archived" : "Open"}
                        </span>

                        {status === "open" ? (
                          <button
                            disabled={busy}
                            onClick={() => setStatus(idx, "processed")}
                            className={[
                              "rounded-xl px-4 py-2 text-sm font-semibold",
                              busy ? "bg-white/60 text-black" : "bg-white text-black hover:bg-white/90",
                            ].join(" ")}
                          >
                            {busy ? "Working..." : "Mark processed"}
                          </button>
                        ) : status === "processed" ? (
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
            “Mark processed” is manual (safe). It doesn’t auto-delete anything — it’s an audit trail so you can handle requests carefully.
          </p>
        </section>
      </main>
    </AdminGate>
  );
}