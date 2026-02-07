"use client";

import { useState } from "react";
import SiteHeader from "../../../components/SiteHeader";

export default function NewTrackPage() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(700);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert("Please enter a track title.");
      return;
    }

    try {
      setBusy(true);

      const res = await fetch("/api/admin/tracks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          price_naira: Number(price) || 700,
        }),
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok) {
        console.error("Create track failed:", out);
        alert(out?.error || "Could not create track (server error).");
        return;
      }

      // success
      window.location.href = "/admin/tracks";
    } catch (err: any) {
      console.error("Create track exception:", err);
      alert("Could not reach the server. Make sure npm run dev is running.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Add track</h1>
        <p className="mt-2 text-sm text-white/65">
          Create a catalogue entry (title → slug generated automatically).
        </p>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Track title</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Example Song A"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>

            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Price (₦)</div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className={[
                "mt-2 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
                busy
                  ? "bg-white/10 text-white/50 ring-1 ring-white/10 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90",
              ].join(" ")}
            >
              {busy ? "Creating..." : "Create track"}
            </button>

            <a
              href="/admin/tracks"
              className="text-center text-sm text-white/60 hover:text-white"
            >
              Cancel
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
