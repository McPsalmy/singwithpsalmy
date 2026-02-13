"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import AdminGate from "../../components/AdminGate";


type TrackRow = {
  id: string;
  title: string;
  slug: string;
  price_naira: number;
  downloads: number;
  is_active: boolean;
  created_at: string;
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminTracksPage() {
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/tracks", { cache: "no-store" });
    const out = await res.json();
    if (!res.ok || !out?.ok) {
      console.error(out);
      alert("Could not load tracks.");
      return;
    }
    setTracks(out.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const activeCount = useMemo(() => tracks.filter((t) => t.is_active).length, [tracks]);

  return (
    <AdminGate>
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-12">
        <a
  href="/psalmy"
  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1 text-xs ring-1 ring-white/15 hover:bg-white/15"
>
  ← Back to dashboard
</a>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Admin: Catalogue</h1>
            <p className="mt-2 text-sm text-white/65">
              Tracks in database: {tracks.length} (active: {activeCount})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Refresh
            </button>

            <a
              href="/admin/tracks/new"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
            >
              Add track
            </a>
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

        <div className="mt-8 overflow-hidden rounded-3xl ring-1 ring-white/10">
          <div className="grid grid-cols-12 gap-0 bg-white/5 px-4 py-3 text-xs text-white/60">
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {tracks.length === 0 ? (
            <div className="bg-black/30 px-4 py-8 text-sm text-white/70">
              No tracks yet. Click <span className="text-white">Add track</span> to create your first entry.
            </div>
          ) : (
            tracks.map((t) => (
              <a
                key={t.id}
                href={`/admin/tracks/${t.id}`}
                className="grid grid-cols-12 items-center gap-0 border-t border-white/10 bg-black/30 px-4 py-4 hover:bg-white/5"
              >
                <div className="col-span-5 min-w-0">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="mt-1 text-xs text-white/55">
                    /track/{t.slug} • {fmtDate(t.created_at)} • {t.downloads} downloads
                  </div>
                </div>

                <div className="col-span-2 text-sm text-white/70">₦{Number(t.price_naira).toLocaleString("en-NG")}</div>

                <div className="col-span-2 flex justify-end">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs ring-1",
                      t.is_active
                        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                        : "bg-white/10 text-white/70 ring-white/15",
                    ].join(" ")}
                  >
                    {t.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
              </a>
            ))
          )}
        </div>

        <p className="mt-8 text-xs text-white/50">
          Next: We’ll add Create/Edit, and later video uploads (6 files per song) with takedown controls.
        </p>
      </section>
    </main>
    </AdminGate>
  );
}
