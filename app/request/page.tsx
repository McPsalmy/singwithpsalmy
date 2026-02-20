"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function RequestPage() {
  const [isMember, setIsMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState<string>("");

  const [email, setEmail] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");

  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  const canSubmit = useMemo(() => {
    if (!isMember) return false;
    if (!email.trim()) return false;
    if (!songTitle.trim()) return false;
    return true;
  }, [isMember, email, songTitle]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setChecking(true);

        const supabase = supabaseAuthClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token || "";

        const res = await fetch("/api/public/membership/status", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const out = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok || !out?.ok) {
          console.error(out);
          setIsMember(false);
          setMemberEmail("");
          return;
        }

        setIsMember(!!out?.isMember);
        const e = String(out?.email || "");
        setMemberEmail(e);

        // Prefill email input for members
        if (out?.isMember && e) setEmail(e);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
      setSongTitle("");
      setArtist("");
      setNotes("");
      setTimeout(() => setSent(false), 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <a href="/membership" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
              <span aria-hidden>←</span> Back to membership
            </a>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Song request</h1>
            <p className="mt-2 text-sm text-white/65">
              Active members can request karaoke practice tracks we don’t have yet.
            </p>
          </div>

          <a
            href="/browse"
            className="hidden md:inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Browse songs
          </a>
        </div>

        {checking ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm text-white/70">Checking membership…</div>
          </div>
        ) : !isMember ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Members-only feature</div>
            <p className="mt-2 text-sm text-white/65">
              Song requests are available to active members. Join membership to unlock requests and full access.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="/membership"
                className="inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                View membership plans
              </a>
              <a
                href="/browse"
                className="inline-block rounded-2xl bg-white/10 px-5 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Browse catalogue
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Request details</div>

            {memberEmail ? (
              <div className="mt-3 text-xs text-white/55">
                Member email: <span className="text-white">{memberEmail}</span>
              </div>
            ) : null}

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

            {sent ? (
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
                  <span>✅</span>
                  <span>Request submitted</span>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold">How it works</div>
              <ol className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex gap-2">
                  <span className="text-white/60">1.</span>
                  Submit the song title (and artist if you know it).
                </li>
                <li className="flex gap-2">
                  <span className="text-white/60">2.</span>
                  We create the karaoke practice tracks and upload them.
                </li>
                <li className="flex gap-2">
                  <span className="text-white/60">3.</span>
                  You download while your membership is active.
                </li>
              </ol>

              <a
                href="/rights-holder"
                className="mt-4 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Rights-holder contact →
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}