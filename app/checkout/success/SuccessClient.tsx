"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type CartItem = {
  slug: string;
  title: string;
  version: "full-guide" | "instrumental" | "low-guide";
};

function versionLabel(v: CartItem["version"]) {
  if (v === "full-guide") return "Practice track (full guide vocals)";
  if (v === "instrumental") return "Performance version (instrumental only)";
  return "Reduced vocals (low guide vocals)";
}

export default function SuccessClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ref, setRef] = useState<string>("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const qpRef = (searchParams.get("ref") || "").trim();

    async function loadFromDb(reference: string) {
      try {
        const res = await fetch(
          `/api/public/orders/get?reference=${encodeURIComponent(reference)}`,
          { cache: "no-store" }
        );
        const out = await res.json().catch(() => ({}));

        if (!res.ok || !out?.ok) {
          setItems([]);
          setRef("");
          return;
        }

        setRef(out.reference || reference);

        // items stored in DB should match {slug,title,version}
        setItems((out.items || []) as CartItem[]);
      } catch {
        setItems([]);
        setRef("");
      }
    }

    // ✅ If ref is in URL, trust DB (works across devices)
    if (qpRef) {
      loadFromDb(qpRef);
      return;
    }

    // ✅ fallback to old localStorage logic (keeps existing checkout flow working)
    const paidUntil = Number(localStorage.getItem("swp_paid_until") || "0");
    const now = Date.now();

    const paidItemsRaw = localStorage.getItem("swp_paid_items");
    const paidRef = localStorage.getItem("swp_paid_ref") || "";

    if (!paidItemsRaw || !paidRef || !paidUntil || now > paidUntil) {
      setItems([]);
      setRef("");
      return;
    }

    setRef(paidRef);
    try {
      setItems(JSON.parse(paidItemsRaw) as CartItem[]);
    } catch {
      setItems([]);
    }
  }, [searchParams]);

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  function clearReceipt() {
    localStorage.removeItem("swp_paid_items");
    localStorage.removeItem("swp_paid_ref");
    localStorage.removeItem("swp_paid_until");
    localStorage.removeItem("swp_cart"); // optional: clear cart after success
    window.dispatchEvent(new Event("swp_cart_changed"));
    window.location.href = "/browse";
  }

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          {hasItems ? "Payment successful ✓" : "No recent purchase found"}
        </h1>

        {hasItems ? (
          <p className="mt-2 text-sm text-white/70">
            Reference: <span className="text-white">{ref}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/70">
            If you just paid, go back to your Paystack receipt link and return to
            the site again.
          </p>
        )}

        {hasItems ? (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Your downloads</div>
            <p className="mt-2 text-sm text-white/65">
              Tap each item to download the full video you paid for.
            </p>

            <div className="mt-5 space-y-3">
              {items.map((it, idx) => (
                <div
                  key={`${it.slug}-${it.version}-${idx}`}
                  className="flex flex-col gap-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {it.title || it.slug}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {versionLabel(it.version)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const u = `/api/public/tracks/paid-download?slug=${encodeURIComponent(
                        it.slug
                      )}&v=${encodeURIComponent(
                        it.version
                      )}&ref=${encodeURIComponent(ref)}`;

                      const a = document.createElement("a");
                      a.href = u;
                      a.download = "";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-white/55 text-center">
              Download didn’t start?{" "}
              <a href="/recover" className="underline hover:text-white">
                Recover purchase (within 30 minutes)
              </a>
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <a
                href="/browse"
                className="rounded-2xl bg-white/10 px-5 py-3 text-center text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Keep browsing
              </a>
              <button
                onClick={clearReceipt}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Clear cart & finish
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <a
              href="/cart"
              className="inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Back to cart
            </a>
          </div>
        )}

        <p className="mt-6 text-xs text-white/50">
          Next upgrade: we’ll replace localStorage-based access with a server-issued
          download token (more secure).
        </p>
      </section>
    </main>
  );
}
