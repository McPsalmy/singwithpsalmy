"use client";

import { useEffect, useState } from "react";

export default function AutoDownload({
  slug,
  version,
}: {
  slug: string;
  version: "full-guide" | "instrumental" | "low-guide";
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setErr(null);

      try {
        // 1) Get signed URL for the full video in Supabase storage
        const r = await fetch(
          `/api/public/tracks/full-url?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(
            version
          )}`,
          { cache: "no-store" }
        );

        const out = await r.json().catch(() => ({}));
        if (!r.ok || !out?.ok || !out?.url) {
          throw new Error(out?.error || `Could not get download URL (HTTP ${r.status})`);
        }

        if (cancelled) return;

        const signedUrl = `/api/public/tracks/download?slug=${encodeURIComponent(
          slug
        )}&v=${encodeURIComponent(version)}`;

        setUrl(signedUrl);

        // 2) Increment downloads (best-effort; we don’t block download if it fails)
        fetch("/api/public/tracks/increment-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        }).catch(() => {});

        // 3) Trigger download
        const a = document.createElement("a");
        a.href = signedUrl;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || "Download failed.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [slug, version]);

  return (
    <div className="mt-6">
      {err ? (
        <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
          ❌ {err}
        </div>
      ) : null}

      {url ? (
        <div className="mt-4 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
          <div className="text-sm text-white/70">
            If the download doesn’t start automatically in 5s, click:
          </div>
          <button
  onClick={() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }}
  className="mt-2 w-full rounded-xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
>
  Download file
</button>

          <p className="mt-3 text-xs text-white/55">
            This link is temporary and may expire.
          </p>
        </div>
      ) : null}
    </div>
  );
}
