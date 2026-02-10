import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen text-white">
          <section className="mx-auto max-w-4xl px-5 py-12">
            <div className="text-sm text-white/70">Loading…</div>
          </section>
        </main>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
