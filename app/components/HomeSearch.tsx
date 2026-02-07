"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function go() {
    const term = q.trim();
    router.push(term ? `/browse?query=${encodeURIComponent(term)}` : "/browse");
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
      <div className="text-white/50">🔍</div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go();
        }}
        placeholder="Search for a song..."
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
      />
      <button
        onClick={go}
        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
      >
        Search
      </button>
    </div>
  );
}
