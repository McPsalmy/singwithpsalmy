import SiteHeader from "../../components/SiteHeader";
import CoverTile from "../../components/CoverTile";
import AutoDownload from "./AutoDownload";
import { cookies } from "next/headers";

type Params = { slug: string };

function niceTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeVersion(v: unknown) {
  const val = Array.isArray(v) ? v[0] : v;
  if (val === "full-guide" || val === "instrumental" || val === "low-guide") return val;
  return "instrumental";
}

function versionLabel(v: string) {
  if (v === "full-guide") return "Practice track (full guide vocals)";
  if (v === "instrumental") return "Performance version (instrumental only)";
  if (v === "low-guide") return "Reduced vocals";
  return "Performance version (instrumental only)";
}

async function isMemberFromCookies() {
  const store = await cookies();
  return store.get("swp_member")?.value === "1";
}

export default async function DownloadPage({
  params,
  searchParams,
}: {
  params: Params | Promise<Params>;
  searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: any }>;
}) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<Params>)
      : (params as Params);

  const sp =
    searchParams && typeof (searchParams as any)?.then === "function"
      ? await (searchParams as Promise<any>)
      : (searchParams as any) || {};

  const slug = resolvedParams?.slug ?? "";
  const v = normalizeVersion(sp?.v);

  const isMember = await isMemberFromCookies();

  // Block non-members
  if (!isMember) {
    return (
      <main className="min-h-screen text-white">
        <SiteHeader />

        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Members-only download
          </h1>

          <p className="mt-4 text-sm text-white/70">
            Full-length karaoke videos are available to members or after checkout.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href="/membership"
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              View membership plans
            </a>

            <a
              href={`/track/${slug}`}
              className="rounded-2xl bg-white/10 px-6 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Back to track
            </a>
          </div>
        </section>
      </main>
    );
  }

  // Member download UI
  const title = slug ? niceTitle(slug) : "Download";

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Download</h1>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-white/10">
              <CoverTile slug={slug} className="h-full w-full" />
            </div>
            <div>
              <div className="text-lg font-semibold">{title}</div>
              <div className="mt-1 text-sm text-white/60">
                Version: <span className="text-white">{versionLabel(v)}</span>
              </div>
            </div>
          </div>

          <AutoDownload slug={slug} version={v} />


          {/* Manual download link is shown inside AutoDownload */}


          <a
            href={`/track/${slug}`}
            className="mt-6 inline-block rounded-2xl bg-white/10 px-5 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Back to track
          </a>
        </div>
      </section>
    </main>
  );
}
