"use client";

import { useMemo, useState } from "react";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const eaddr = email.trim();
    if (!eaddr || !eaddr.includes("@")) {
      setMsg("Please enter a valid email address.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.resetPasswordForEmail(eaddr, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
    });

    setBusy(false);

    // Always show a generic message for security
    if (error) {
      setMsg("If that email exists, we’ve sent a password reset link.");
      return;
    }

    setMsg("✅ If that email exists, we’ve sent a password reset link.");
  }

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-md px-5 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-white/70">
          Enter your email and we’ll send you a password reset link.
        </p>

        <form
          onSubmit={sendReset}
          className="mt-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10"
        >
          <label className="block text-sm text-white/80">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-2 w-full rounded-xl bg-black/40 px-4 py-3 text-sm text-white ring-1 ring-white/15 outline-none"
            placeholder="you@example.com"
            required
          />

          <button
            disabled={busy}
            className={[
              "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold",
              busy ? "bg-white/10 text-white/70" : "bg-white text-black hover:bg-white/90",
            ].join(" ")}
          >
            {busy ? "Working..." : "Send reset link"}
          </button>

          {msg ? (
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
              {msg}
            </div>
          ) : null}

          <div className="mt-5 text-center text-xs text-white/60">
            Back to{" "}
            <a href="/signin" className="text-white underline hover:text-white/90">
              Sign in
            </a>
            .
          </div>
        </form>
      </section>
    </main>
  );
}
