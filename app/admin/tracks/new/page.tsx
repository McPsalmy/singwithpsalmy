"use client";

import { useState } from "react";
import SiteHeader from "../../../components/SiteHeader";
import UploadSlots from "../../../components/UploadSlots";
import AdminGate from "../../../components/AdminGate";

export default function NewTrackPage() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(700);
  const [busy, setBusy] = useState(false);

  const [created, setCreated] = useState<{ id: string; slug: string } | null>(
    null
  );

  // Debug helpers (we'll remove later)
  const [debug, setDebug] = useState<string>("");
  const [lastOut, setLastOut] = useState<any>(null);

  async function submit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert("Please enter a track title.");
      return;
    }

    try {
      setBusy(true);
      setDebug("submit() started");
      setLastOut(null);

      const res = await fetch("/api/admin/tracks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          price_naira: Number(price) || 700,
        }),
      });

      const out = await res.json().catch(() => ({}));
      setDebug(`response status: ${res.status}`);
      setLastOut(out);

      if (!res.ok || !out?.ok) {
        console.error("Create track failed:", out);
        setDebug("Create failed (see lastOut)");
        alert(out?.error || "Could not create track (server error).");
        return;
      }

      const id = String(out?.id || "");
      const slug = String(out?.slug || "");

      if (!id || !slug) {
        setDebug("Create succeeded but response missing id/slug (see lastOut)");
        alert("Created, but missing id/slug in response. See debug panel.");
        return;
      }

      setCreated({ id, slug });
      setDebug("Created state set ✓");
    } catch (err: any) {
      console.error("Create track exception:", err);
      setDebug(`Exception: ${err?.message || "unknown"}`);
      alert("Could not reach the server. Make sure npm run dev is running.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGate>
      <main className="min-h-screen text-white">
        <SiteHeader />

        <section className="mx-auto max-w-3xl px-5 py-12">
          <h1 className="text-3xl font-semibold tracking-tight">Add track</h1>
          <p className="mt-2 text-sm text-white/65">
            Create a catalogue entry (title → slug generated automatically), then
            upload the 6 MP4 files.
          </p>

          {/* Debug panel (temporary) */}
          <div className="mt-4 rounded-2xl bg-white/5 p-4 text-xs text-white/70 ring-1 ring-white/10">
            <div>
              debug: <span className="text-white/90">{debug || "(empty)"}</span>
            </div>
            <div className="mt-2">
              created:{" "}
              <span className="text-white/90">
                {created ? JSON.stringify(created) : "null"}
              </span>
            </div>
            <div className="mt-2 break-all">
              lastOut:{" "}
              <span className="text-white/90">
                {lastOut ? JSON.stringify(lastOut) : "null"}
              </span>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Track title</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Example Song A"
                  disabled={!!created}
                  className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40 disabled:opacity-60"
                />
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Price (₦)</div>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  disabled={!!created}
                  className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40 disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={busy || !!created}
                className={[
                  "mt-2 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
                  busy || created
                    ? "bg-white/10 text-white/50 ring-1 ring-white/10 cursor-not-allowed"
                    : "bg-white text-black hover:bg-white/90",
                ].join(" ")}
              >
                {busy ? "Creating..." : created ? "Track created ✓" : "Create track"}
              </button>

              <a
                href="/admin/tracks"
                className="text-center text-sm text-white/60 hover:text-white"
              >
                Cancel
              </a>
            </div>
          </div>

          {/* After creation: show created info + upload slots */}
          {created ? (
            <div className="mt-6">
              <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-sm text-white/60">Created</div>
                <div className="mt-1 text-lg font-semibold">
                  Slug: <span className="text-white">{created.slug}</span>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={`/admin/tracks/${created.id}`}
                    className="rounded-2xl bg-white/10 px-5 py-3 text-center text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    View track detail →
                  </a>
                  <a
                    href="/admin/tracks"
                    className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-black hover:bg-white/90"
                  >
                    Go to catalogue
                  </a>
                </div>
              </div>

              <UploadSlots slug={created.slug} />
            </div>
          ) : null}
        </section>
      </main>
    </AdminGate>
  );
}
