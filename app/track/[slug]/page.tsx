import CoverTile from "../../components/CoverTile";
import SiteHeader from "../../components/SiteHeader";
import BackButton from "../../components/BackButton";
import PurchaseButton from "./PurchaseButton";
import VersionPreview from "./VersionPreview";

type Params = { slug: string };

function niceTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function TrackPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<Params>)
      : (params as Params);

  const slug = resolvedParams?.slug ?? "";
  const title = slug ? niceTitle(slug) : "Track";

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="mb-4">
              <BackButton />
            </div>

            <div className="text-xs text-white/60">Track</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {title}
            </h1>

            <p className="mt-2 text-sm text-white/65">
              Preview the 30-second watermark clip for each version below.
            </p>

            <div className="mt-6 overflow-hidden rounded-3xl ring-1 ring-white/10">
              <div className="aspect-[16/10] w-full">
                <CoverTile slug={slug} className="h-full w-full object-cover" />
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold">Members can request songs</div>
              <p className="mt-1 text-sm text-white/70">
                Can’t find what you want? Active members can request karaoke
                practice tracks not yet in the catalogue.
              </p>
              <a
                href="/request"
                className="mt-3 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Request a song →
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Preview</div>

            <div className="mt-4">
              <VersionPreview slug={slug} />
            </div>

            <div className="mt-4">
              <PurchaseButton slug={slug} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
