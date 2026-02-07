"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import CoverTile from "../../components/CoverTile";

type CartItem = {
  slug: string;
  title: string;
  version: "full-guide" | "instrumental" | "low-guide";
};

function versionLabel(v: CartItem["version"]) {
  if (v === "full-guide") return "Practice track (full guide vocals)";
  if (v === "instrumental") return "Performance version (instrumental only)";
  return "Reduced vocals";
}

export default function CartCheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("swp_cart");
    setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
  }, []);

  const total = useMemo(() => items.length * 700, [items.length]);

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-2 text-sm text-white/65">
          Checkout all cart items in one payment.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: items */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Items</div>

            {items.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm text-white/70">Your cart is empty.</div>
                <a
                  href="/browse"
                  className="mt-4 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Browse songs
                </a>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={`${it.slug}-${it.version}-${idx}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-black/30 px-4 py-3 ring-1 ring-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-white/10">
                        <CoverTile slug={it.slug} className="h-full w-full" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{it.title}</div>
                        <div className="text-xs text-white/60">{versionLabel(it.version)}</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold">₦700</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: summary + pay */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Order Summary</div>

            <div className="mt-5 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Items</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/70">Price per item</span>
                <span className="text-white/80">₦700</span>
              </div>
              <div className="mt-4 h-px bg-white/10" />
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-white/70">Total</span>
                <span className="text-lg font-semibold">₦{total.toLocaleString("en-NG")}</span>
              </div>
            </div>

            <button
              disabled={!items.length}
              className={[
                "mt-6 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
                items.length
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/10 text-white/50 ring-1 ring-white/10 cursor-not-allowed",
              ].join(" ")}
            >
              Pay ₦{total.toLocaleString("en-NG")}
            </button>

            <p className="mt-4 text-xs text-white/55">
              Payments will be connected next (Stripe/Paystack). This page is the correct cart total.
            </p>

            <a
              href="/cart"
              className="mt-4 inline-block rounded-2xl bg-white/10 px-5 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Back to cart
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
