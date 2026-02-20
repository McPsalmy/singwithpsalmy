"use client";

import { useEffect, useRef, useState } from "react";

function safeNext(path: string) {
  // prevent open-redirect abuse (only allow internal)
  if (!path || typeof path !== "string") return "/";
  if (!path.startsWith("/")) return "/";
  return path;
}

export default function PaystackCallbackPage() {
  const [msg, setMsg] = useState("Verifying payment...");
  const [error, setError] = useState<string | null>(null);

  const ranRef = useRef(false);

  useEffect(() => {
    // Fix "page becomes unresponsive after returning from Paystack":
    // Some browsers restore this page from BFCache. This ensures a clean reload.
    const onPageshow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageshow);
    return () => window.removeEventListener("pageshow", onPageshow);
  }, []);

  useEffect(() => {
    // Prevent double-run in dev strict mode / re-mounts
    if (ranRef.current) return;
    ranRef.current = true;

    const url = new URL(window.location.href);
    const reference = url.searchParams.get("reference");

    if (!reference) {
      setError("Missing Paystack reference.");
      setMsg("Payment could not be verified.");
      return;
    }

    (async () => {
      try {
        setError(null);
        setMsg("Verifying payment...");

        const res = await fetch(
          `/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`,
          { cache: "no-store" }
        );

        const out = await res.json().catch(() => ({} as any));

        if (!res.ok || !out?.ok) {
          console.error(out);
          setError(out?.error || `Verify failed (HTTP ${res.status}).`);
          setMsg("Payment could not be verified.");
          return;
        }

        // ✅ MEMBERSHIP: no legacy cookies anymore
        if (out?.kind === "membership") {
          const email = String(out?.email || "").trim().toLowerCase();

          // If they’re already logged in with Supabase, send them to membership directly.
          // Otherwise, ask them to log in with the same email used for payment.
          // (Membership is now identity-based via Supabase Auth.)
          if (!email) {
            setMsg("Membership verified ✓ Redirecting...");
            setTimeout(() => {
              window.location.href = "/membership";
            }, 600);
            return;
          }

          // Optional: store a hint so the sign-in page can prefill email (nice UX)
          try {
            localStorage.setItem("swp_email", email);
          } catch {
            // ignore
          }

          setMsg("Membership verified ✓ Please log in to activate access...");

          // Send them to sign-in with next=/membership
          // (You can also send to /signup if you prefer.)
          setTimeout(() => {
            window.location.href = `/signin?next=${encodeURIComponent(safeNext("/membership"))}`;
          }, 900);

          return;
        }

        // ✅ ONE-OFF PURCHASES: keep your existing flow
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
      <section className="mx-auto max-w-2xl px-5 py-12">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
        >
          <span aria-hidden>←</span> Home
        </a>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Payment status</h1>
        <p className="mt-3 text-sm text-white/70">{msg}</p>

        {error ? (
          <div className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
            ❌ {error}
            <div className="mt-3 flex flex-wrap gap-2">
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
              <a
                href="/membership"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Membership
              </a>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-xs text-white/50">
          Tip: For membership access, log in with the same email used for payment.
        </p>
      </section>
    </main>
  );
}