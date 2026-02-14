"use client";

import { useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function SignUpPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/signin`,
      },
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("✅ Account created. Check your email to confirm, then sign in.");
  }

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-md px-5 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-white/70">
          Create an account to unlock membership benefits when your email is subscribed.
        </p>

        <form
          onSubmit={signUp}
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

          <label className="mt-4 block text-sm text-white/80">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="mt-2 w-full rounded-xl bg-black/40 px-4 py-3 text-sm text-white ring-1 ring-white/15 outline-none"
            placeholder="Choose a strong password"
            required
            minLength={8}
          />

          <button
            disabled={busy}
            className={[
              "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold",
              busy ? "bg-white/10 text-white/70" : "bg-white text-black hover:bg-white/90",
            ].join(" ")}
          >
            {busy ? "Working..." : "Create account"}
          </button>

          {msg ? (
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
              {msg}
            </div>
          ) : null}
        </form>

        <p className="mt-6 text-xs text-white/55">
          Already have an account?{" "}
          <a className="underline" href="/signin">
            Sign in
          </a>
          .
        </p>
      </section>
    </main>
  );
}
