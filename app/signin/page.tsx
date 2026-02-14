"use client";

import { useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function SignInPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);
  const [mode, setMode] = useState<"password" | "magic">("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.href = "/membership";
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/membership`,
      },
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("✅ Check your email for the sign-in link.");
  }

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-md px-5 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-white/70">
          Sign in to access membership features and manage your account.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setMode("password")}
            className={[
              "rounded-xl px-4 py-2 text-sm ring-1",
              mode === "password"
                ? "bg-white text-black ring-white"
                : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
            ].join(" ")}
          >
            Email + Password
          </button>

          <button
            onClick={() => setMode("magic")}
            className={[
              "rounded-xl px-4 py-2 text-sm ring-1",
              mode === "magic"
                ? "bg-white text-black ring-white"
                : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
            ].join(" ")}
          >
            Magic link
          </button>
        </div>

        <form
          onSubmit={mode === "password" ? signInPassword : sendMagicLink}
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

          {mode === "password" ? (
            <>
              <label className="mt-4 block text-sm text-white/80">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-2 w-full rounded-xl bg-black/40 px-4 py-3 text-sm text-white ring-1 ring-white/15 outline-none"
                placeholder="Your password"
                required
              />

              <div className="mt-3 text-right">
                <a
                  href="/reset-password"
                  className="text-xs text-white/70 underline hover:text-white"
                >
                  Forgot password?
                </a>
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-white/60">
              We’ll email you a secure sign-in link.
            </p>
          )}

          <button
            disabled={busy}
            className={[
              "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold",
              busy ? "bg-white/10 text-white/70" : "bg-white text-black hover:bg-white/90",
            ].join(" ")}
          >
            {busy ? "Working..." : mode === "password" ? "Sign in" : "Send link"}
          </button>

          {msg ? (
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
              {msg}
            </div>
          ) : null}

          <div className="mt-5 text-center text-xs text-white/60">
            New here?{" "}
            <a href="/signup" className="text-white underline hover:text-white/90">
              Create an account
            </a>
            .
          </div>
        </form>

        <p className="mt-6 text-xs text-center text-white/55">
          You don't need an account to purchase karaoke videos. All you need is your email address.
        </p>
        <p className="mt-2 text-xs text-center text-white/55">
          Accounts are mainly for subscribing members.
        </p>
      </section>
    </main>
  );
}
