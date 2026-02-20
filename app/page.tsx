import CoverTile from "./components/CoverTile";
import HomeSearch from "./components/HomeSearch";
import { headers } from "next/headers";

type Track = {
  id: string;
  title: string;
  slug: string;
  price_naira: number;
  downloads: number;
  created_at: string;
};

async function getTracks(): Promise<Track[]> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = host ? `${proto}://${host}` : "";

  const res = await fetch(`${base}/api/public/tracks`, { cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return [];

  const out = await res.json().catch(() => ({}));
  if (!out?.ok) return [];

  return (out.data ?? []) as Track[];
}

function money(n?: number) {
  return `₦${Number(n ?? 700).toLocaleString("en-NG")}`;
}

export default async function Home() {
  const tracks = await getTracks();

  // Newest first (reliable)
  const newestFirst = [...tracks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Featured = random picks (stable for this page load)
  const featured = (() => {
    const pool = [...tracks];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5); // hide the 5th on mobile
  })();

  const mostDownloaded = [...tracks]
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, 4);

  const newlyAdded = newestFirst.slice(0, 5); // hide 5th on mobile

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Sing your heart out
          </h1>

          <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">
            High-quality karaoke practice tracks for practice, performance, and pure fun.
          </p>

          <div className="mt-7">
            <HomeSearch />
          </div>

          <div className="mt-7 mx-auto max-w-2xl rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-left sm:text-left">
                <div className="text-xs text-white/60">Membership</div>
                <div className="mt-1 text-lg font-semibold">
                  Unlimited access to the full library + song request benefits
                </div>
                <div className="mt-1 text-sm text-white/65">
                  Active members download instantly while subscription is active.
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
                <a
                  href="/membership"
                  className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                >
                  View plans
                </a>
                <a
                  href="/request"
                  className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                >
                  Request a song
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Featured */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Featured songs</h2>
              <p className="mt-2 text-sm text-white/65">
                Quick picks from across the catalogue.
              </p>
            </div>

            <a
              href="/browse"
              className="hidden rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15 md:inline-block"
            >
              View all →
            </a>
          </div>

          {/* mobile-friendly secondary link */}
          <a
            href="/browse"
            className="mt-3 inline-block text-sm text-white/70 underline hover:text-white md:hidden"
          >
            Browse all songs →
          </a>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {featured.map((s, idx) => (
              <a
                key={s.id}
                href={`/track/${s.slug}`}
                className={[
                  "group rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/10",
                  idx >= 4 ? "hidden sm:block" : "",
                ].join(" ")}
              >
                <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
                  <div className="aspect-square w-full">
                    <CoverTile slug={s.slug} className="h-full w-full object-cover" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {money(s.price_naira)} • {(s.downloads ?? 0).toLocaleString("en-NG")} downloads
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/70 group-hover:text-white">
                  View song →
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Most downloaded */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Most downloaded</h2>
              <p className="mt-2 text-sm text-white/65">Popular picks from the community.</p>
            </div>

            <a
              href="/browse?sort=downloads"
              className="hidden rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15 md:inline-block"
            >
              Explore →
            </a>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {mostDownloaded.map((s) => (
              <a
                key={s.id}
                href={`/track/${s.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-white/10">
                    <CoverTile slug={s.slug} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{s.title}</div>
                    <div className="text-xs text-white/60">
                      {(s.downloads ?? 0).toLocaleString("en-NG")} downloads
                    </div>
                  </div>
                </div>

                <div className="text-xs text-white/70">View →</div>
              </a>
            ))}
          </div>
        </div>

        {/* Newly added */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Newly added</h2>
              <p className="mt-2 text-sm text-white/65">Fresh uploads — newest first.</p>
            </div>

            <a
              href="/browse?sort=date"
              className="hidden rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15 md:inline-block"
            >
              Browse →
            </a>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {newlyAdded.map((s, idx) => (
              <a
                key={s.id}
                href={`/track/${s.slug}`}
                className={[
                  "group rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/10",
                  idx >= 4 ? "hidden sm:block" : "",
                ].join(" ")}
              >
                <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
                  <div className="aspect-square w-full">
                    <CoverTile slug={s.slug} className="h-full w-full object-cover" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs text-white/60">{money(s.price_naira)}</div>
                </div>

                <div className="mt-3 text-xs text-white/70 group-hover:text-white">
                  View song →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}