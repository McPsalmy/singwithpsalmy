"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Track = {
  id: string;
  title: string;
  slug: string;
  price_naira: number;
  downloads: number;
  created_at: string;
};

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string) {
  const t = norm(s).replace(/\s+/g, "");
  const arr: string[] = [];
  for (let i = 0; i < t.length - 1; i++) arr.push(t.slice(i, i + 2));
  return arr;
}

function jaccard(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const m = a.length;
  const n = b.length;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

function editSimilarity(a: string, b: string) {
  const A = norm(a);
  const B = norm(b);
  if (!A || !B) return 0;
  const d = levenshtein(A, B);
  const maxLen = Math.max(A.length, B.length);
  return maxLen === 0 ? 1 : 1 - d / maxLen;
}

function matchScore(queryRaw: string, titleRaw: string) {
  const q = norm(queryRaw);
  const t = norm(titleRaw);
  if (!q) return 1;

  if (t.includes(q)) return 1;

  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = t.split(" ").filter(Boolean);

  let hits = 0;
  for (const tok of qTokens) {
    if (tok.length < 2) continue;
    if (t.includes(tok)) hits++;
  }
  const tokenScore = hits / Math.max(1, qTokens.length);

  const bgScore = jaccard(bigrams(q), bigrams(t));

  let bestTokSum = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const tt of tTokens) best = Math.max(best, editSimilarity(qt, tt));
    bestTokSum += best;
  }
  const editTokScore = bestTokSum / Math.max(1, qTokens.length);
  const editWholeScore = editSimilarity(q, t);

  const score = Math.max(tokenScore, bgScore, editTokScore * 0.95, editWholeScore * 0.85);
  return Math.min(1, score);
}

export default function HomeSearch() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/public/tracks", { cache: "no-store" });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out?.ok) setTracks(out.data ?? []);
    })();
  }, []);

  // Close dropdown only on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return [];

    return tracks
      .map((t) => ({ t, score: matchScore(query, t.title) }))
      .filter((x) => x.score >= 0.5)
      .sort((a, b) => b.score - a.score || a.t.title.localeCompare(b.t.title))
      .slice(0, 8)
      .map((x) => x.t);
  }, [q, tracks]);

  function goToTrack(slug: string) {
    setOpen(false);
    router.push(`/track/${slug}`);
  }

  function goToBrowse() {
    const query = q.trim();
    setOpen(false);
    router.push(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search songs..."
          className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
        />
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl bg-black/90 ring-1 ring-white/15 backdrop-blur">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/70">No matches.</div>
          ) : (
            results.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()} // prevent focus/blur weirdness
                onClick={() => goToTrack(t.slug)}
                className="block w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/10"
              >
                <div className="font-semibold text-white">{t.title}</div>
                <div className="mt-1 text-xs text-white/60">
                  ₦{Number(t.price_naira).toLocaleString("en-NG")}
                </div>
              </button>
            ))
          )}

          <div className="border-t border-white/10 px-4 py-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={goToBrowse}
              className="text-xs text-white/60 hover:text-white"
            >
              Browse all songs →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
