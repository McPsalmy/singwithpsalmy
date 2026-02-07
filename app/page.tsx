import SiteHeader from "./components/SiteHeader";
import CoverTile from "./components/CoverTile";
import HomeSearch from "./components/HomeSearch";


const categories = ["All", "Afrobeats", "Gospel", "Pop", "Hip-hop", "R&B", "More"];

const featured = [
  { title: "Example Song A", slug: "example-song-a", cat: "Afrobeats" },
  { title: "Example Song B", slug: "example-song-b", cat: "Gospel" },
  { title: "Example Song C", slug: "example-song-c", cat: "Pop" },
  { title: "Example Song D", slug: "example-song-d", cat: "Hip-hop" },
  { title: "Example Song E", slug: "example-song-e", cat: "Afrobeats" },
];

export default function Home() {
  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-10">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Sing Your Heart Out
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70 md:text-lg">
            High-quality karaoke practice tracks for practice, performance, and pure fun.
          </p>

          {/* Search bar */}
          <div className="mt-7">
            <HomeSearch />

          </div>

          {/* Category pills */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {categories.map((c, i) => (
              <button
                key={c}
                className={[
                  "rounded-xl px-4 py-2 text-sm ring-1 transition",
                  i === 0
                    ? "bg-white/10 text-white ring-white/20"
                    : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          
            <div className="mt-7 mx-auto max-w-2xl rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <div className="text-xs text-white/60">Membership</div>
      <div className="mt-1 text-lg font-semibold">Unlimited Access to our Full Library + Song Request benefits</div>
      
    </div>

    <div className="flex gap-3">
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
        </div>

        {/* Featured grid (5 columns on desktop) */}
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
            {featured.map((s) => (
              <a
                key={s.slug}
                href={`/track/${s.slug}`}
                className="group rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/10"
              >
                <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
                  <div className="aspect-square w-full">
                    <CoverTile slug={s.slug} className="h-full w-full object-cover" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs text-white/60">{s.cat}</div>
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
    {[
      { title: "Example Song A", slug: "example-song-a", note: "High energy • crowd favorite" },
      { title: "Example Song B", slug: "example-song-b", note: "Great for practice sessions" },
      { title: "Example Song C", slug: "example-song-c", note: "Smooth and fun to sing" },
      { title: "Example Song D", slug: "example-song-d", note: "Great for parties" },
    ].map((s) => (
      <a
        key={s.slug}
        href={`/track/${s.slug}`}
        className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-white/10">
            <CoverTile slug={s.slug} className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-semibold">{s.title}</div>
            <div className="text-xs text-white/60">{s.note}</div>
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
    {[
      { title: "Newest Song", slug: "example-song-e", cat: "Afrobeats" },
      { title: "New Song 2", slug: "example-song-d", cat: "Hip-hop" },
      { title: "New Song 3", slug: "example-song-c", cat: "Pop" },
      { title: "New Song 4", slug: "example-song-b", cat: "Gospel" },
      { title: "New Song 5", slug: "example-song-a", cat: "Afrobeats" },
    ].map((s) => (
      <a
        key={s.slug}
        href={`/track/${s.slug}`}
        className="group rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/10"
      >
        <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
          <div className="aspect-square w-full">
            <CoverTile slug={s.slug} className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-sm font-semibold">{s.title}</div>
          <div className="mt-1 text-xs text-white/60">{s.cat}</div>
        </div>

        <div className="mt-3 text-xs text-white/70 group-hover:text-white">
          View Song →
        </div>
      </a>
    ))}
  </div>
</div>


        {/* Footer mini */}
        
      </section>
    </main>
  );
}
