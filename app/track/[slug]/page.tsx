import CoverTile from "../../components/CoverTile";
import SiteHeader from "../../components/SiteHeader";
import BackButton from "../../components/BackButton";
import PurchaseButton from "./PurchaseButton";
import VersionPreview from "./VersionPreview";
import { headers } from "next/headers";
import type { Metadata } from "next";


type Params = { slug: string };

type TrackRow = {
  id: string;
  title: string;
  slug: string;
  price_naira: number;
  downloads: number;
  created_at: string;
};

async function getTrackBySlug(slug: string): Promise<TrackRow | null> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = host ? `${proto}://${host}` : "";

  const res = await fetch(`${base}/api/public/tracks`, { cache: "no-store" }).catch(
    () => null
  );
  if (!res || !res.ok) return null;

  const out = await res.json().catch(() => ({}));
  if (!out?.ok) return null;

  const list = (out.data ?? []) as TrackRow[];
  return list.find((t) => t.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params | Promise<Params>;
}): Promise<Metadata> {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<Params>)
      : (params as Params);

  const slug = resolvedParams?.slug ?? "";
  const track = slug ? await getTrackBySlug(slug) : null;

  const title = track?.title ? track.title : "Track";
  const description = track?.title
    ? `Preview and download "${track.title}" — karaoke practice tracks and performance versions in Nigeria (₦).`
    : "Preview and download karaoke practice tracks and performance versions in Nigeria (₦).";

  return {
    title,
    description,
    alternates: {
      canonical: `/track/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/track/${slug}`,
      type: "website",
    },
  };
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

  const track = slug ? await getTrackBySlug(slug) : null;
  const title = track?.title ?? "Track";

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
              <div className="text-sm font-semibold">
                Members can request songs
              </div>
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
              <PurchaseButton slug={slug} title={title} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
