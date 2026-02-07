"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import CoverTile from "../components/CoverTile";

type CartItem = {
  slug: string;
  title: string;
  version: "full-guide" | "instrumental" | "low-guide";
};

function niceTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function versionLabel(v: CartItem["version"]) {
  if (v === "full-guide") return "Practice track (full guide vocals)";
  if (v === "instrumental") return "Performance version (instrumental only)";
  return "Reduced vocals (low guide vocals)";
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("swp_cart");
    setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
  }, []);

  function save(next: CartItem[]) {
    setItems(next);
    localStorage.setItem("swp_cart", JSON.stringify(next));
  }

  function removeAt(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    save(next);
  }

  function clear() {
    save([]);
  }

  const total = useMemo(() => items.length * 700, [items.length]);

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
            <p className="mt-2 text-sm text-white/65">
              Review your items and checkout once (₦700 per item).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clear}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Clear cart
            </button>
            <a
              href="/browse"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Continue shopping
            </a>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            {items.length === 0 ? (
              <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
                <div className="text-lg font-semibold">Your cart is empty</div>
                <p className="mt-2 text-sm text-white/65">
                  Browse songs and add versions to your cart.
                </p>
                <a
                  href="/browse"
                  className="mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Browse songs
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={`${it.slug}-${it.version}-${idx}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl ring-1 ring-white/10">
                        <CoverTile slug={it.slug} className="h-full w-full" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {it.title || niceTitle(it.slug)}
                        </div>
                        <div className="text-xs text-white/60">
                          {versionLabel(it.version)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold">₦700</div>
                      <button
                        onClick={() => removeAt(idx)}
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Order Summary</div>

            <div className="mt-4 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
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
            
            <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm text-white/70 ring-1 ring-white/10">
                <span className="font-semibold text-white">Tip:</span> Members download instantly (no checkout) while subscription is active.
            </div>

            <a
              href={items.length ? "/checkout/cart" : "/browse"}
              className={[
                "mt-6 block w-full rounded-2xl px-5 py-3 text-center text-sm font-semibold",
                items.length
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/10 text-white/50 ring-1 ring-white/10 pointer-events-none",
              ].join(" ")}
            >
              Checkout
            </a>

            <p className="mt-4 text-xs text-white/55">
              Payments will be connected next. This is the cart flow UI.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
