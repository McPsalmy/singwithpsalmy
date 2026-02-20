"use client";

import { useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function SignInPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);
  const [mode, setMode] = useState<"password" | "magic">("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

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

    // After sign-in, go to Dashboard (membership status + future order history)
    window.location.href = "/dashboard";
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://singwithpsalmy.com";

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Magic link will return to dashboard after login
        emailRedirectTo: `${siteUrl}/dashboard`,
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
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-white/70">
          Log in to manage your membership and access member-only features.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("password");
              setMsg(null);
            }}
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
            type="button"
            onClick={() => {
              setMode("magic");
              setMsg(null);
              setShowPassword(false);
            }}
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
            autoComplete="email"
            required
          />

          {mode === "password" ? (
            <>
              <label className="mt-4 block text-sm text-white/80">Password</label>

              <div className="mt-2 relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl bg-black/40 px-4 py-3 pr-12 text-sm text-white ring-1 ring-white/15 outline-none"
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/80 ring-1 ring-white/15 hover:bg-white/15"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <a
                  href="/reset-password"
                  className="text-xs text-white/70 underline hover:text-white"
                >
                  Forgot password?
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setMode("magic");
                    setMsg(null);
                    setShowPassword(false);
                  }}
                  className="text-xs text-white/70 underline hover:text-white"
                >
                  Use magic link instead
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 text-xs text-white/60">
                We’ll email you a secure sign-in link. No password needed.
              </p>

              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setMsg(null);
                  }}
                  className="text-xs text-white/70 underline hover:text-white"
                >
                  Use password instead
                </button>
              </div>
            </>
          )}

          <button
            disabled={busy}
            className={[
              "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold",
              busy ? "bg-white/10 text-white/70" : "bg-white text-black hover:bg-white/90",
            ].join(" ")}
          >
            {busy ? "Working..." : mode === "password" ? "Log in" : "Send link"}
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

        <div className="mt-6 rounded-2xl bg-white/5 p-4 text-center text-xs text-white/60 ring-1 ring-white/10">
          <div className="text-white/80">Quick note</div>
          <div className="mt-1">
            You don’t need an account to purchase karaoke practice tracks — just your email address.
          </div>
          <div className="mt-1">
            Accounts are mainly for members (subscription access, renewals, and upcoming dashboards).
          </div>
        </div>
      </section>
    </main>
  );
}