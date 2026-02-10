"use client";

import { useEffect, useState } from "react";

type VersionKey = "full-guide" | "instrumental" | "low-guide";

type Props = {
  slug: string;
  title: string;
};


export default function PurchaseButton({ slug, title }: Props) {
  const [isMember, setIsMember] = useState(false);

  // FULL-LENGTH selection (not previews)
  const [selected, setSelected] = useState<VersionKey>("instrumental"); // will be synced from preview on load

  // toast
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setIsMember(localStorage.getItem("swp_member") === "1");
  }, []);

  function addToCart() {
    const raw = localStorage.getItem("swp_cart");
    const cart = raw ? (JSON.parse(raw) as any[]) : [];

    cart.push({ slug, title, version: selected });
    localStorage.setItem("swp_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("swp_cart_changed"));


    setToast("Added to cart ✓");
    setTimeout(() => setToast(null), 1200);
  }

  useEffect(() => {
  const storageKey = `swp_version_${slug}`;

  const read = () => {
    const saved = localStorage.getItem(storageKey) as VersionKey | null;
    if (saved === "full-guide" || saved === "instrumental" || saved === "low-guide") {
      setSelected(saved);
    }
  };

  // initial sync
  read();

  // keep synced when VersionPreview changes it
  window.addEventListener("swp_version_changed", read as any);

  return () => {
    window.removeEventListener("swp_version_changed", read as any);
  };
}, [slug]);


  return (
    <div className="mt-8">
      <div className="text-sm font-semibold">
        {isMember ? "Select full-length version to download" : "Select full-length version"}
      </div>

      {/* FULL LENGTH selection */}
      <div className="mt-3 grid gap-3">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
          <div>
            <div className="text-sm font-semibold">Practice track</div>
            <div className="mt-1 text-xs text-white/60">(full guide vocals)</div>
          </div>
          <input
            type="radio"
            name="full_version"
            value="full-guide"
            checked={selected === "full-guide"}
            onChange={() => {
              setSelected("full-guide");
              localStorage.setItem(`swp_version_${slug}`, "full-guide");
              window.dispatchEvent(new Event("swp_version_changed"));
            }}

          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
          <div>
            <div className="text-sm font-semibold">Performance version</div>
            <div className="mt-1 text-xs text-white/60">(instrumental only)</div>
          </div>
          <input
            type="radio"
            name="full_version"
            value="instrumental"
            checked={selected === "instrumental"}
            onChange={() => {
              setSelected("instrumental");
              localStorage.setItem(`swp_version_${slug}`, "instrumental");
              window.dispatchEvent(new Event("swp_version_changed"));
            }}

          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
          <div>
            <div className="text-sm font-semibold">Reduced vocals</div>
            <div className="mt-1 text-xs text-white/60">(low guide vocals)</div>
          </div>
          <input
            type="radio"
            name="full_version"
            value="low-guide"
            checked={selected === "low-guide"}
            onChange={() => {
              setSelected("low-guide");
              localStorage.setItem(`swp_version_${slug}`, "low-guide");
              window.dispatchEvent(new Event("swp_version_changed"));
            }}

          />
        </label>
      </div>

      {/* Actions */}
      {isMember ? (
        <a
          href={`/download/${slug}?v=${selected}`}
          className="mt-5 block w-full rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-black hover:bg-white/90"
        >
          Download full video
        </a>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={addToCart}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
          >
            Add to cart (₦700)
          </button>

          <a
            href="/cart"
            className="rounded-2xl bg-white/10 px-5 py-3 text-center text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Go to cart
          </a>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
            <span>🛒</span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-white/55">
        Preview tabs above are for watermarked 30s previews only. This section selects the full-length version.
      </p>
    </div>
  );
}
