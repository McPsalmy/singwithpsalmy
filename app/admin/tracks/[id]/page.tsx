"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";

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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminTrackDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [track, setTrack] = useState<TrackRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;

    const res = await fetch(`/api/admin/tracks/${id}`, { cache: "no-store" });
    const out = await res.json();

    if (!res.ok || !out?.ok) {
      console.error(out);
      alert("Could not load track.");
      return;
    }

    setTrack(out.data as TrackRow);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleActive() {
    if (!track) return;

    setBusy(true);
    const nextActive = !track.is_active;

    const res = await fetch("/api/admin/tracks/toggle-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: track.id, is_active: nextActive }),
    });

    const out = await res.json();
    setBusy(false);

    if (!res.ok || !out?.ok) {
      console.error(out);
      alert("Could not update status.");
      return;
    }

    setTrack({ ...track, is_active: nextActive });
  }

  async function deleteTrack() {
    alert("Delete is coming next (we’ll add a safe API route).");
  }

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Track</h1>
            <p className="mt-2 text-sm text-white/65">
              Admin detail page (hide/unhide for takedowns).
            </p>
          </div>

          <a
            href="/admin/tracks"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Back to list
          </a>
        </div>

        {!track ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm text-white/70">Loading track…</div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-xs text-white/60">{fmtDate(track.created_at)}</div>
                <div className="mt-1 text-xl font-semibold">{track.title}</div>

                <div className="mt-2 text-sm text-white/70">
                  Public URL:{" "}
                  <span className="text-white">/track/{track.slug}</span>
                </div>

                <div className="mt-1 text-sm text-white/70">
                  Price:{" "}
                  <span className="text-white">
                    ₦{Number(track.price_naira).toLocaleString("en-NG")}
                  </span>
                </div>

                <div className="mt-1 text-sm text-white/70">
                  Downloads: <span className="text-white">{track.downloads}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs ring-1",
                    track.is_active
                      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                      : "bg-white/10 text-white/70 ring-white/15",
                  ].join(" ")}
                >
                  {track.is_active ? "Active" : "Hidden"}
                </span>

                <button
                  disabled={busy}
                  onClick={toggleActive}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold",
                    track.is_active
                      ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
                      : "bg-white text-black hover:bg-white/90",
                    busy ? "opacity-60" : "",
                  ].join(" ")}
                >
                  {busy ? "Working..." : track.is_active ? "Hide" : "Unhide"}
                </button>

                <button
                  disabled
                  onClick={deleteTrack}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 opacity-60"
                  title="Coming next"
                >
                  Delete
                </button>
              </div>
            </div>

            <p className="mt-6 text-xs text-white/55">
              Hiding a track removes it from public browse/search (useful for takedown requests).
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
