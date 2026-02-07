import SiteHeader from "../../components/SiteHeader";
import CoverTile from "../../components/CoverTile";

type Params = { slug: string };

function niceTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function StemPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<Params>)
      : (params as Params);

  const slug = resolvedParams?.slug ?? "";
  const title = slug ? niceTitle(slug) : "Stem Select";

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Stem Select</h1>
        <p className="mt-2 text-sm text-white/65">
          Choose a version for checkout. (Live stem mixing can be added later.)
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: track card */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-white/10">
                <CoverTile slug={slug} className="h-full w-full" />
              </div>
              <div>
                <div className="text-xs text-white/60">Track</div>
                <div className="mt-1 text-xl font-semibold">{title}</div>
                <div className="mt-1 text-sm text-white/60">Flat ₦700 per version</div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl ring-1 ring-white/10">
              <div className="aspect-[16/10] bg-gradient-to-br from-fuchsia-500/25 via-indigo-500/15 to-cyan-400/20" />
            </div>
          </div>

          {/* Right: options */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Select your version</div>

            <div className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
                <div>
                  <div className="text-sm font-semibold">Practice track</div>
                  <div className="mt-1 text-xs text-white/60">(full guide vocals)</div>
                </div>
                <div className="text-sm font-semibold">₦700</div>
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
                <div>
                  <div className="text-sm font-semibold">Performance version</div>
                  <div className="mt-1 text-xs text-white/60">(instrumental only)</div>
                </div>
                <div className="text-sm font-semibold">₦700</div>
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
                <div>
                  <div className="text-sm font-semibold">Practice track</div>
                  <div className="mt-1 text-xs text-white/60">(low guide vocals)</div>
                </div>
                <div className="text-sm font-semibold">₦700</div>
              </label>
            </div>

            <a
              href={`/checkout/${slug}`}
              className="mt-6 block w-full rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-black hover:bg-white/90"
            >
              Continue to checkout
            </a>

            <p className="mt-4 text-xs text-white/55">
              Checkout and delivery will be connected next.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
