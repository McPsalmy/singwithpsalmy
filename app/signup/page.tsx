"use client";

import { useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function SignUpPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const eaddr = email.trim().toLowerCase();
    if (!eaddr || !eaddr.includes("@")) {
      setMsg("Please enter a valid email.");
      return;
    }

    if (password.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    setBusy(true);

    const { error } = await supabase.auth.signUp({
      email: eaddr,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/membership`,
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
          Create an account to manage membership and access premium features.
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
          <div className="relative mt-2">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPass ? "text" : "password"}
              className="w-full rounded-xl bg-black/40 px-4 py-3 pr-12 text-sm text-white ring-1 ring-white/15 outline-none"
              placeholder="Create a password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80 ring-1 ring-white/15 hover:bg-white/15"
              aria-label={showPass ? "Hide password" : "Show password"}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <label className="mt-4 block text-sm text-white/80">Confirm password</label>
          <div className="relative mt-2">
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type={showConfirm ? "text" : "password"}
              className="w-full rounded-xl bg-black/40 px-4 py-3 pr-12 text-sm text-white ring-1 ring-white/15 outline-none"
              placeholder="Re-enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80 ring-1 ring-white/15 hover:bg-white/15"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>

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

          <div className="mt-5 text-center text-xs text-white/60">
            Already have an account?{" "}
            <a href="/signin" className="text-white underline hover:text-white/90">
              Log in
            </a>
            .
          </div>
        </form>

        <p className="mt-6 text-xs text-center text-white/55">
          You don’t need an account to purchase karaoke videos — accounts are mainly for members.
        </p>
      </section>
    </main>
  );
}
