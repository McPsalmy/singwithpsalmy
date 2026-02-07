"use client";

import { useEffect, useState } from "react";

type Props = {
  slug: string;
  className?: string;
};

export default function CoverTile({ slug, className }: Props) {
  const [hasCover, setHasCover] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHasCover(null);

    const img = new Image();
    img.onload = () => {
      if (!cancelled) setHasCover(true);
    };
    img.onerror = () => {
      if (!cancelled) setHasCover(false);
    };
    img.src = `/covers/${slug}.jpg`;

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
      {hasCover && (
        <img
          src={`/covers/${slug}.jpg`}
          alt="Cover tile"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
