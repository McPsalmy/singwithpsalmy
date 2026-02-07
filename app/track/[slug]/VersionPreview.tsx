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
  {
    key: "full-guide",
    label: "Practice track",
    sub: "(full guide vocals)",
  },
  {
    key: "instrumental",
    label: "Performance version",
    sub: "(instrumental only)",
  },
  {
    key: "low-guide",
    label: "Reduced vocals",
    sub: "(low guide vocals)",
  },
];

export default function VersionPreview({ slug }: Props) {
  const storageKey = `swp_version_${slug}`;

  const [active, setActive] = useState<VersionKey>("instrumental");

  // On load: if user previously picked a version, reuse it
  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as VersionKey | null;
    if (saved === "full-guide" || saved === "instrumental" || saved === "low-guide") {
      setActive(saved);
    } else {
      localStorage.setItem(storageKey, "instrumental");
    }
    // Tell other components (PurchaseButton) to read the current version
    window.dispatchEvent(new Event("swp_version_changed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function choose(next: VersionKey) {
    setActive(next);
    localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event("swp_version_changed"));
  }

  const src = useMemo(() => {
    // Naming convention:
    // /videos/previews/<slug>-<version>-preview_web.mp4
    return `/videos/previews/${slug}-${active}-preview_web.mp4`;
  }, [slug, active]);

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
        <video
          key={src}
          className="w-full"
          controls
          playsInline
          preload="metadata"
          src={src}
        />
      </div>

      <p className="mt-3 text-xs text-white/60">
        30-second watermark preview. Full video download available after checkout (or instantly for members).
      </p>
    </div>
  );
}
