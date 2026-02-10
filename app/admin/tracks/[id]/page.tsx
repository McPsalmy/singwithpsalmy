"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import AdminGate from "../../../components/AdminGate";

type TrackRow = {
  id: string;
  title: string;
  slug: string;
  price_naira: number;
  downloads: number;
  is_active: boolean;
  created_at: string;
};

type UploadStatus = {
  ok: boolean;
  preview?: { "full-guide": boolean; instrumental: boolean; "low-guide": boolean };
  full?: { "full-guide": boolean; instrumental: boolean; "low-guide": boolean };
  cover?: string | null;
  error?: string;
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
  const params = useParams();
  const raw = (params as any)?.id;
  const id = Array.isArray(raw) ? String(raw[0] || "") : String(raw || "");

  const [track, setTrack] = useState<TrackRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function loadTrack() {
    if (!id) return;

    setLoadError(null);

    try {
      const res = await fetch(`/api/admin/tracks/${id}`, { cache: "no-store" });
      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok) {
        console.error(out);
        setLoadError(out?.error || `Could not load track (HTTP ${res.status}).`);
        setTrack(null);
        return;
      }

      setTrack(out.data as TrackRow);
    } catch (e: any) {
      setLoadError(e?.message || "Could not reach server.");
      setTrack(null);
    }
  }

  async function loadStatus(slug: string) {
    setStatusError(null);

    try {
      const res = await fetch(`/api/admin/uploads/status?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      const out = (await res.json().catch(() => ({}))) as UploadStatus;

      if (!res.ok || !out?.ok) {
        console.error(out);
        setStatus(null);
        setStatusError(out?.error || `Could not load upload status (HTTP ${res.status}).`);
        return;
      }

      setStatus(out);
    } catch (e: any) {
      setStatus(null);
      setStatusError(e?.message || "Could not reach server for upload status.");
    }
  }

  useEffect(() => {
    loadTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (track?.slug) loadStatus(track.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.slug]);

  async function toggleActive() {
    if (!track) return;

    setBusy(true);
    const nextActive = !track.is_active;

    const res = await fetch("/api/admin/tracks/toggle-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: track.id, is_active: nextActive }),
    });

    const out = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok || !out?.ok) {
      console.error(out);
      alert(out?.error || "Could not update status.");
      return;
    }

    setTrack({ ...track, is_active: nextActive });
  }

  async function deleteTrack() {
    if (!track) return;

    const first = confirm(
      `Delete this track?\n\nTitle: ${track.title}\nSlug: ${track.slug}\n\nThis will remove the database row AND delete files in Supabase storage.`
    );
    if (!first) return;

    const typed = prompt("Type DELETE to confirm (case-sensitive):");
    if (typed !== "DELETE") {
      alert("Cancelled. (You must type DELETE exactly.)");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/tracks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: track.id, slug: track.slug }),
      });

      const out = await res.json().catch(() => ({}));
      setBusy(false);

      if (!res.ok || !out?.ok) {
        console.error(out);
        alert(out?.error || `Delete failed (HTTP ${res.status}).`);
        return;
      }

      alert(`Deleted. Removed ${out?.removed ?? 0} file(s).`);
      window.location.href = "/admin/tracks";
    } catch (e: any) {
      setBusy(false);
      alert(e?.message || "Delete failed.");
    }
  }

  async function openStoragePath(path: string) {
    try {
      const res = await fetch("/api/admin/storage/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok || !out?.url) {
        console.error(out);
        alert(out?.error || `Could not open file (HTTP ${res.status}).`);
        return;
      }

      window.open(out.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message || "Could not open file.");
    }
  }

  const counts = useMemo(() => {
    const p = status?.preview;
    const f = status?.full;

    const previewCount =
      (p?.["full-guide"] ? 1 : 0) + (p?.instrumental ? 1 : 0) + (p?.["low-guide"] ? 1 : 0);
    const fullCount =
      (f?.["full-guide"] ? 1 : 0) + (f?.instrumental ? 1 : 0) + (f?.["low-guide"] ? 1 : 0);

    return { previewCount, fullCount, hasCover: !!status?.cover };
  }, [status]);

  return (
    <AdminGate>
      <main className="min-h-screen text-white">
        <SiteHeader />

        <section className="mx-auto max-w-4xl px-5 py-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Track</h1>
              <p className="mt-2 text-sm text-white/65">
                Admin detail page (view + hide/unhide + delete). Uploads happen on{" "}
                <span className="text-white">Add track</span>.
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

              {loadError ? (
                <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                  ❌ {loadError}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="text-xs text-white/60">{fmtDate(track.created_at)}</div>
                  <div className="mt-1 text-xl font-semibold">{track.title}</div>

                  <div className="mt-2 text-sm text-white/70">
                    Public URL: <span className="text-white">/track/{track.slug}</span>
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
                    disabled={busy}
                    onClick={deleteTrack}
                    className={[
                      "rounded-xl px-4 py-2 text-sm ring-1 ring-white/15",
                      busy ? "opacity-60 bg-white/10" : "bg-red-500/20 hover:bg-red-500/30",
                    ].join(" ")}
                    title="Delete track + files"
                  >
                    {busy ? "Working..." : "Delete"}
                  </button>
                </div>
              </div>

              {/* Upload status (view-only) */}
              <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-lg font-semibold">Uploaded files</div>
                    <p className="mt-1 text-sm text-white/65">
                      View-only status. To upload/replace files, go to{" "}
                      <span className="text-white">Add track</span>.
                    </p>
                  </div>

                  <button
                    onClick={() => loadStatus(track.slug)}
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Refresh status
                  </button>
                </div>

                {statusError ? (
                  <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                    ❌ {statusError}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {/* Cover */}
                  <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-white/60">Cover tile</div>
                    <div className="mt-2 text-sm font-semibold">
                      {counts.hasCover ? "Uploaded ✓" : "Not uploaded"}
                    </div>

                    <div className="mt-2 text-xs text-white/60 break-all">
                      {status?.cover ?? `covers/${track.slug}.jpg (or .jpeg/.png/.webp)`}
                    </div>

                    {status?.cover ? (
                      <button
                        onClick={() => openStoragePath(status.cover!)}
                        className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs ring-1 ring-white/15 hover:bg-white/15"
                      >
                        View
                      </button>
                    ) : null}
                  </div>

                  {/* Previews */}
                  <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-white/60">Previews</div>
                    <div className="mt-2 text-sm font-semibold">
                      {counts.previewCount}/3 uploaded
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      {(["full-guide", "instrumental", "low-guide"] as const).map((v) => {
                        const exists = !!status?.preview?.[v];
                        const path = `previews/${track.slug}-${v}-preview_web.mp4`;

                        return (
                          <div key={v} className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-white/70">
                              <span className="text-white/80">{v}</span>{" "}
                              <span className="text-white/50">({exists ? "✓" : "—"})</span>
                            </div>

                            {exists ? (
                              <button
                                onClick={() => openStoragePath(path)}
                                className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[11px] ring-1 ring-white/15 hover:bg-white/15"
                              >
                                View
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Full videos */}
                  <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="text-xs text-white/60">Full videos</div>
                    <div className="mt-2 text-sm font-semibold">
                      {counts.fullCount}/3 uploaded
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      {(["full-guide", "instrumental", "low-guide"] as const).map((v) => {
                        const exists = !!status?.full?.[v];
                        const path = `full/${track.slug}-${v}-full.mp4`;

                        return (
                          <div key={v} className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-white/70">
                              <span className="text-white/80">{v}</span>{" "}
                              <span className="text-white/50">({exists ? "✓" : "—"})</span>
                            </div>

                            {exists ? (
                              <button
                                onClick={() => openStoragePath(path)}
                                className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[11px] ring-1 ring-white/15 hover:bg-white/15"
                              >
                                View
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs text-white/50">
                  Tip: “View” opens a temporary signed link to the exact file stored in Supabase.
                </p>
              </div>

              <p className="mt-6 text-xs text-white/55">
                Hiding a track removes it from public browse/search (useful for takedown requests).
              </p>
            </div>
          )}
        </section>
      </main>
    </AdminGate>
  );
}
