"use client";

import { useState } from "react";

export default function RecoverPage() {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function recover() {
    setErr(null);
    const r = ref.trim();
    if (!r) {
      setErr("Enter your Paystack reference from the receipt email.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(r)}`, {
        cache: "no-store",
      });
      const out = await res.json().catch(() => ({}));
      setBusy(false);

      if (!res.ok || !out?.ok) {
        setErr(out?.error || `Could not verify (HTTP ${res.status}).`);
        return;
      }

      window.location.href = `/checkout/success?ref=${encodeURIComponent(r)}`;

    } catch (e: any) {
      setBusy(false);
      setErr(e?.message || "Could not reach server.");
    }
  }

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Recover your purchase</h1>
        <p className="mt-2 text-sm text-white/65">
          If you paid but didn’t download, paste the Paystack reference from your receipt email.
        </p>

        <div className="mt-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <label className="text-xs text-white/70">Paystack reference</label>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. 9m4n2kq3..."
            className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-white/40"
          />

          {err ? (
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
              ❌ {err}
            </div>
          ) : null}

          <button
            onClick={recover}
            disabled={busy}
            className={[
              "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
              busy ? "bg-white/10 text-white/60 ring-1 ring-white/10" : "bg-white text-black hover:bg-white/90",
            ].join(" ")}
          >
            {busy ? "Verifying..." : "Recover downloads"}
          </button>

          <p className="mt-3 text-xs text-white/50">
            Your Paystack reference is in the successful payment email from Paystack.
          </p>
        </div>
      </section>
    </main>
  );
}
