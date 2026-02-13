import SiteHeader from "./components/SiteHeader";
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

  const res = await fetch(`${base}/api/public/tracks`, { cache: "no-store" }).catch(
    () => null
  );
  if (!res || !res.ok) return [];

  const out = await res.json().catch(() => ({}));
  if (!out?.ok) return [];

  return (out.data ?? []) as Track[];
}

export default async function Home() {
  const tracks = await getTracks();

  // Featured = random picks (stable for this page load)
  const featured = (() => {
    const pool = [...tracks];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5); // we'll hide the 5th on mobile
  })();

  const mostDownloaded = [...tracks]
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, 4);

  const newlyAdded = tracks.slice(0, 5); // hide 5th on mobile

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Sing Your Heart Out
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">
            High-quality karaoke practice tracks for practice, performance, and pure fun.
          </p>

          <div className="mt-7">
            <HomeSearch />
          </div>

          <div className="mt-7 mx-auto max-w-2xl rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs text-white/60">Membership</div>
                <div className="mt-1 text-lg font-semibold">
                  Unlimited Access to our Full Library + Song Request benefits
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
              <h2 className="text-2xl font-semibold tracking-tight">Featured Songs</h2>
            </div>

            <a
              href="/browse"
              className="hidden rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15 md:inline-block"
            >
              View all →
            </a>
          </div>

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
                    ₦{Number(s.price_naira ?? 700).toLocaleString("en-NG")} •{" "}
                    {(s.downloads ?? 0).toLocaleString("en-NG")} downloads
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/70 group-hover:text-white">
                  View Song →
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Most downloaded */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Most Downloaded</h2>
              <p className="mt-2 text-sm text-white/65">
                Popular picks from the community.
              </p>
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
              <h2 className="text-2xl font-semibold tracking-tight">Newly Added</h2>
              <p className="mt-2 text-sm text-white/65">
                Fresh uploads — newest first.
              </p>
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
                  <div className="mt-1 text-xs text-white/60">
                    ₦{Number(s.price_naira ?? 700).toLocaleString("en-NG")}
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/70 group-hover:text-white">
                  View Song →
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
