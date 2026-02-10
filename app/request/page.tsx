"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseClient } from "../lib/supabaseClient";

export default function RequestPage() {
  const [isMember, setIsMember] = useState(false);

  const [email, setEmail] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");

  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    if (!isMember) return false;
    if (!email.trim()) return false;
    if (!songTitle.trim()) return false;
    return true;
  }, [isMember, email, songTitle]);

  useEffect(() => {
    setIsMember(localStorage.getItem("swp_member") === "1");
  }, []);

  async function submit() {
    if (!canSubmit) return;

    try {
      setBusy(true);

      const supabase = supabaseClient();

      const { error } = await supabase.from("song_requests").insert([
        {
          email: email.trim(),
          song_title: songTitle.trim(),
          artist: artist.trim() || null,
          notes: notes.trim() || null,
        },
      ]);

      if (error) {
        console.error(error);
        alert("Could not submit request. Please try again.");
        return;
      }

      setSent(true);
      setEmail("");
      setSongTitle("");
      setArtist("");
      setNotes("");
      setTimeout(() => setSent(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Song Request</h1>
        <p className="mt-2 text-sm text-white/65">
          Members can request karaoke practice tracks that aren’t in the catalogue yet.
        </p>

        {!isMember ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Members-only feature</div>
            <p className="mt-2 text-sm text-white/65">
              Song requests are available to active members. Subscribe to unlock requests
              and full access to the catalogue.
            </p>

            <a
              href="/membership"
              className="mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              View membership plans
            </a>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Request details</div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Your email address</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. you@gmail.com"
                  className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
                <p className="mt-2 text-xs text-white/55">
                  We only use this to notify you when your requested track is available.
                </p>
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Song title</div>
                <input
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="e.g. Hallelujah"
                  className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Artist (optional)</div>
                <input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g. Jeff Buckley"
                  className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any extra info? Tempo preference, key change, etc."
                  className="mt-2 min-h-[110px] w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit || busy}
              className={[
                "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
                canSubmit && !busy
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/10 text-white/50 ring-1 ring-white/10 cursor-not-allowed",
              ].join(" ")}
            >
              {busy ? "Submitting..." : "Submit request"}
            </button>

            {sent && (
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
                  <span>✅</span>
                  <span>Request submitted</span>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold">How it works</div>
              <ol className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex gap-2">
                  <span className="text-white/60">1.</span>
                  Submit the song title (and artist if you know it).
                </li>
                <li className="flex gap-2">
                  <span className="text-white/60">2.</span>
                  We create the karaoke practice tracks and upload them to the catalogue.
                </li>
                <li className="flex gap-2">
                  <span className="text-white/60">3.</span>
                  You’ll be able to download the new track versions while your membership is active.
                </li>
              </ol>

              <p className="mt-3 text-xs text-white/55">
                Rights-holders & publishers: if you own or represent a song and would like to
                discuss promotion, licensing, or any concerns, please include your preferred
                contact details in the notes (or visit our Rights-holder page). We’ll respond
                promptly.
              </p>

              <a
                href="/rights-holder"
                className="mt-4 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Rights-holder page →
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
