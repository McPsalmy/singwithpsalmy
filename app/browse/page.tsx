"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import CoverTile from "../components/CoverTile";

type Track = {
  id: string;
  title: string;
  slug: string;
  price_naira: number;
  downloads: number;
  created_at: string;
};

function niceTitle(title: string) {
  return title?.trim() || "Untitled";
}

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

const SORT_LABEL: Record<"name" | "date" | "downloads", string> = {
  name: "By Name",
  date: "By Date (newest)",
  downloads: "Most Downloaded",
};

// 20 on mobile, 40 on desktop
function getPageSize() {
  if (typeof window === "undefined") return 40;
  return window.matchMedia("(min-width: 768px)").matches ? 40 : 20;
}

// Compact page buttons like: 1 2 3 … 10
function getCompactPages(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);

  for (let p = current - 1; p <= current + 1; p++) {
    if (p > 1 && p < total) pages.add(p);
  }
  // also keep 2 and total-1 to reduce "jumpiness"
  pages.add(2);
  pages.add(total - 1);

  const arr = Array.from(pages).filter((p) => p >= 1 && p <= total);
  arr.sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1) {
      const gap = arr[i + 1] - arr[i];
      if (gap > 1) out.push("…");
    }
  }
  return out;
}

export default function BrowsePage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "date" | "downloads">("name");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  // custom dropdown
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);

  // persist view
  useEffect(() => {
    const saved = localStorage.getItem("swp_browse_view");
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("swp_browse_view", view);
  }, [view]);

  // close dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!sortRef.current) return;
      if (!sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // pageSize: 20 mobile / 40 desktop
  useEffect(() => {
    function update() {
      setPageSize(getPageSize());
    }
    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/public/tracks", { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !out?.ok) {
      console.error(out);
      alert("Could not load tracks.");
      return;
    }

    setTracks(out.data ?? []);
  }

  // initial load + read query params from URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const initialQ = url.searchParams.get("q") || "";
    const initialSort = url.searchParams.get("sort");

    if (initialQ) setQ(initialQ);
    if (initialSort === "name" || initialSort === "date" || initialSort === "downloads") {
      setSort(initialSort);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim();

    const withScores = tracks
      .map((t) => ({ t, score: matchScore(query, t.title) }))
      .filter((x) => (query ? x.score >= 0.5 : true));

    if (query) {
      withScores.sort((a, b) => b.score - a.score || a.t.title.localeCompare(b.t.title));
      return withScores.map((x) => x.t);
    }

    const list = withScores.map((x) => x.t);

    if (sort === "name") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "date") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      list.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    }

    return list;
  }, [tracks, q, sort]);

  // Reset to page 1 when search/sort/view/pageSize changes so users don't land on empty pages
  useEffect(() => {
    setPage(1);
  }, [q, sort, view, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const compactPages = useMemo(() => getCompactPages(safePage, totalPages), [safePage, totalPages]);

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Browse Songs</h1>
            <p className="mt-2 text-sm text-white/60">
              Showing{" "}
              <span className="text-white">
                {filtered.length.toLocaleString("en-NG")}
              </span>{" "}
              song{filtered.length === 1 ? "" : "s"}
              {loading ? "" : ` • ${pageSize}/page`}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/60">Sort by</div>

              <div ref={sortRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSortOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10"
                >
                  <span>{SORT_LABEL[sort]}</span>
                  <span className="text-white/60">▾</span>
                </button>

                {sortOpen && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-black/90 ring-1 ring-white/15 backdrop-blur">
                    {(["name", "date", "downloads"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setSort(k);
                          setSortOpen(false);
                        }}
                        className={[
                          "w-full px-4 py-3 text-left text-sm hover:bg-white/10",
                          k === sort ? "text-white" : "text-white/75",
                        ].join(" ")}
                      >
                        {SORT_LABEL[k]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 md:w-[420px]">
              <div className="flex-1 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search songs..."
                  className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView("grid")}
                  className={[
                    "rounded-xl px-3 py-2 text-sm ring-1",
                    view === "grid"
                      ? "bg-white text-black ring-white/20"
                      : "bg-white/5 text-white ring-white/10 hover:bg-white/10",
                  ].join(" ")}
                >
                  Grid
                </button>
                <button
                  onClick={() => setView("list")}
                  className={[
                    "rounded-xl px-3 py-2 text-sm ring-1",
                    view === "list"
                      ? "bg-white text-black ring-white/20"
                      : "bg-white/5 text-white ring-white/10 hover:bg-white/10",
                  ].join(" ")}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10 text-sm text-white/70">
              Loading songs…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10 text-sm text-white/70">
              No songs found.
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
              {pageItems.map((t) => (
                <a
                  key={t.id}
                  href={`/track/${t.slug}`}
                  className="group rounded-3xl bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/10"
                >
                  <div className="aspect-square overflow-hidden rounded-2xl ring-1 ring-white/10">
                    <CoverTile slug={t.slug} className="h-full w-full object-cover" />
                  </div>

                  <div className="mt-3">
                    <div className="truncate text-sm font-semibold">{niceTitle(t.title)}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-white/60">
                      <span>₦{Number(t.price_naira).toLocaleString("en-NG")}</span>
                      <span>{t.downloads || 0} dl</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {pageItems.map((t) => (
                <a
                  key={t.id}
                  href={`/track/${t.slug}`}
                  className="flex items-center justify-between gap-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-white/10">
                      <CoverTile slug={t.slug} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{niceTitle(t.title)}</div>
                      <div className="mt-1 text-xs text-white/60">/track/{t.slug}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ₦{Number(t.price_naira).toLocaleString("en-NG")}
                    </div>
                    <div className="mt-1 text-xs text-white/60">{t.downloads || 0} downloads</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && filtered.length > 0 ? (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="text-xs text-white/55">
                Page <span className="text-white">{safePage}</span> of{" "}
                <span className="text-white">{totalPages}</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className={[
                    "rounded-xl px-3 py-2 text-sm ring-1",
                    safePage <= 1
                      ? "bg-white/5 text-white/40 ring-white/10"
                      : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
                  ].join(" ")}
                >
                  Prev
                </button>

                {compactPages.map((p, idx) =>
                  p === "…" ? (
                    <span key={`dots-${idx}`} className="px-2 text-white/50">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={[
                        "rounded-xl px-3 py-2 text-sm ring-1",
                        p === safePage
                          ? "bg-white text-black ring-white/20"
                          : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className={[
                    "rounded-xl px-3 py-2 text-sm ring-1",
                    safePage >= totalPages
                      ? "bg-white/5 text-white/40 ring-white/10"
                      : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
                  ].join(" ")}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
