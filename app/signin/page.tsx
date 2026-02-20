"use client";

import { useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://singwithpsalmy.com";
}

function looksUnconfirmedEmail(errMsg: string) {
  const s = (errMsg || "").toLowerCase();
  return (
    s.includes("email not confirmed") ||
    s.includes("email_not_confirmed") ||
    s.includes("confirm your email") ||
    s.includes("confirmation") ||
    s.includes("not confirmed")
  );
}

export default function SignInPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);
  const [mode, setMode] = useState<"password" | "magic">("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // When we detect “email not confirmed”
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setNeedsConfirm(false);
    setBusy(true);

    const eemail = email.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: eemail,
      password,
    });

    setBusy(false);

    if (error) {
      const m = error.message || "Login failed.";
      setMsg(m);
      if (looksUnconfirmedEmail(m)) setNeedsConfirm(true);
      return;
    }

    window.location.href = "/dashboard";
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setNeedsConfirm(false);
    setBusy(true);

    const siteUrl = getSiteUrl();
    const eemail = email.trim();

    const { error } = await supabase.auth.signInWithOtp({
      email: eemail,
      options: {
        emailRedirectTo: `${siteUrl}/dashboard`,
      },
    });

    setBusy(false);

    if (error) {
      const m = error.message || "Could not send link.";
      setMsg(m);
      // Even here, if they’re “unconfirmed”, resend link helps anyway.
      if (looksUnconfirmedEmail(m)) setNeedsConfirm(true);
      return;
    }

    setMsg("✅ Check your email for the sign-in link.");
  }

  async function resendConfirmation() {
    const eemail = email.trim();
    if (!eemail || !eemail.includes("@")) {
      setMsg("Please enter a valid email address first.");
      return;
    }

    setConfirmBusy(true);
    setMsg(null);

    try {
      // Sending OTP link effectively “resends” an email that gets them into the app.
      // If email confirmations are enabled, this gives them the right path forward.
      const siteUrl = getSiteUrl();

      const { error } = await supabase.auth.signInWithOtp({
        email: eemail,
        options: {
          emailRedirectTo: `${siteUrl}/dashboard`,
        },
      });

      if (error) {
        setMsg(error.message || "Could not resend confirmation email.");
        setConfirmBusy(false);
        return;
      }

      setNeedsConfirm(false);
      setMsg("✅ Email sent. Please check your inbox (and spam/junk).");
    } catch (e: any) {
      setMsg(e?.message || "Could not resend email.");
    } finally {
      setConfirmBusy(false);
    }
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
              setNeedsConfirm(false);
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
              setNeedsConfirm(false);
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
                    setNeedsConfirm(false);
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
                    setNeedsConfirm(false);
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

          {/* Email confirmation helper */}
          {needsConfirm ? (
            <div className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm ring-1 ring-amber-400/20">
              <div className="font-semibold text-amber-200">Email not confirmed</div>
              <div className="mt-1 text-white/70">
                Please confirm your email address. If you didn’t get the email, you can resend it.
              </div>

              <button
                type="button"
                disabled={confirmBusy}
                onClick={resendConfirmation}
                className={[
                  "mt-3 inline-flex rounded-xl px-3 py-2 text-sm font-semibold ring-1",
                  confirmBusy
                    ? "bg-white/10 text-white/70 ring-white/15"
                    : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
                ].join(" ")}
              >
                {confirmBusy ? "Sending..." : "Resend email"}
              </button>

              <div className="mt-2 text-xs text-white/60">
                Tip: also check Spam/Junk or Promotions tabs.
              </div>
            </div>
          ) : null}

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
            Accounts are mainly for members (subscription access, renewals, and dashboards).
          </div>
        </div>
      </section>
    </main>
  );
}