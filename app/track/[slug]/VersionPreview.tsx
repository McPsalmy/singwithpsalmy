"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  slug: string;
};

type VersionKey = "full-guide" | "instrumental" | "low-guide";

const versions: {
  key: VersionKey;
  label: string;
  sub: string;
}[] = [
  { key: "full-guide", label: "Practice track", sub: "(full guide vocals)" },
  { key: "instrumental", label: "Performance version", sub: "(instrumental only)" },
  { key: "low-guide", label: "Reduced vocals", sub: "(low guide vocals)" },
];

export default function VersionPreview({ slug }: Props) {
  const storageKey = `swp_version_${slug}`;
  const [active, setActive] = useState<VersionKey>("instrumental");

  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sync active tab with localStorage + PurchaseButton
  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem(storageKey) as VersionKey | null;
      if (saved === "full-guide" || saved === "instrumental" || saved === "low-guide") {
        setActive(saved);
      } else {
        localStorage.setItem(storageKey, "instrumental");
        setActive("instrumental");
      }
    };

    read();
    window.addEventListener("swp_version_changed", read as any);
    return () => window.removeEventListener("swp_version_changed", read as any);
  }, [storageKey]);

  function choose(next: VersionKey) {
    setActive(next);
    localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event("swp_version_changed"));
  }

  // Fetch signed URL whenever active changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      const res = await fetch(
        `/api/public/preview-url?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(active)}`,
        { cache: "no-store" }
      ).catch(() => null);

      if (!res) {
        if (!cancelled) {
          setErr("Could not reach server for preview URL.");
          setSrc("");
          setLoading(false);
        }
        return;
      }

      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok || !out?.url) {
        if (!cancelled) {
          setErr(out?.error || "Preview not available yet (upload the preview file).");
          setSrc("");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setSrc(String(out.url));
        setLoading(false);
      }
    }

    if (slug) run();

    return () => {
      cancelled = true;
    };
  }, [slug, active]);

  const videoKey = useMemo(() => `${slug}-${active}-${src}`, [slug, active, src]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {versions.map((v) => {
          const isActive = v.key === active;
          return (
            <button
              key={v.key}
              onClick={() => choose(v.key)}
              className={[
                "rounded-xl px-4 py-2 text-left text-sm ring-1 transition",
                isActive
                  ? "bg-white/15 text-white ring-white/25"
                  : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <div className="font-semibold">{v.label}</div>
              <div className="text-xs text-white/60">{v.sub}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
        {loading ? (
          <div className="px-4 py-10 text-sm text-white/70">Loading preview…</div>
        ) : err ? (
          <div className="px-4 py-10 text-sm text-white/70">❌ {err}</div>
        ) : src ? (
  <video
    key={videoKey}
    className="w-full"
    controls
    playsInline
    preload="metadata"
    src={src}
  />
) : (
  <div className="px-4 py-10 text-sm text-white/70">
    ❌ Preview not available yet (upload the preview file).
  </div>
)
}
      </div>

      <p className="mt-3 text-xs text-white/60">
        30-second watermark preview. Full video download available after checkout (or instantly for members).
      </p>
    </div>
  );
}
