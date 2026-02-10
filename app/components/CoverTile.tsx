"use client";

import { useEffect, useState } from "react";

type Props = {
  slug: string;
  className?: string;
};

const mem = new Map<string, string>(); // slug -> signed url (session cache)

export default function CoverTile({ slug, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!slug) {
        setSrc(null);
        return;
      }

      // quick cache
      const cached = mem.get(slug);
      if (cached) {
        setSrc(cached);
        return;
      }

      const res = await fetch(`/api/public/cover-url?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      }).catch(() => null);

      if (!res) {
        if (!cancelled) setSrc(null);
        return;
      }

      if (!res.ok) {
        if (!cancelled) setSrc(null);
        return;
      }

      const out = await res.json().catch(() => ({}));
      const url = out?.url ? String(out.url) : null;

      if (!cancelled && url) {
        mem.set(slug, url);
        setSrc(url);
      } else if (!cancelled) {
        setSrc(null);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{
        backgroundImage: `url(/covers/default.svg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {src && (
        <img
          src={src}
          alt="Cover tile"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
