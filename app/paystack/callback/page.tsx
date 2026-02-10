"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";

export default function PaystackCallbackPage() {
  const [msg, setMsg] = useState("Verifying payment...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      setError("Missing Paystack reference.");
      setMsg("Payment could not be verified.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`, {
          cache: "no-store",
        });

        const out = await res.json().catch(() => ({}));

        if (!res.ok || !out?.ok) {
          console.error(out);
          setError(out?.error || `Verify failed (HTTP ${res.status}).`);
          setMsg("Payment could not be verified.");
          return;
        }

        // Success: store proof for the next step (downloads unlock)
        // We'll keep it simple for now; next step we’ll turn this into a secure server token.
        localStorage.setItem("swp_paid_ref", reference);
        localStorage.setItem("swp_paid_items", JSON.stringify(out.items || []));
        localStorage.setItem("swp_paid_until", String(Date.now() + 1000 * 60 * 30)); // 30 mins window

        // Clear cart after successful verification (so user doesn't pay twice)
localStorage.removeItem("swp_cart");
window.dispatchEvent(new Event("swp_cart_changed"));


        setMsg("Payment verified ✓ Redirecting...");
        setTimeout(() => {
          window.location.href = "/checkout/success";
        }, 800);
      } catch (e: any) {
        setError(e?.message || "Could not reach server.");
        setMsg("Payment could not be verified.");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Payment status</h1>
        <p className="mt-3 text-sm text-white/70">{msg}</p>

        {error ? (
          <div className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
            ❌ {error}
            <div className="mt-3 flex gap-2">
              <a
                href="/cart"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Back to cart
              </a>
              <a
                href="/browse"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Browse songs
              </a>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-xs text-white/50">
          Note: This is test-mode verification. Next we’ll lock downloads to verified payments server-side.
        </p>
      </section>
    </main>
  );
}
