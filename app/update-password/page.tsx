"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean>(false);

  useEffect(() => {
    async function check() {
      // If the user arrived via the reset link, Supabase will create a session in the URL
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data?.session);
    }
    check();
  }, [supabase]);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const p = password.trim();
    const c = confirm.trim();

    if (p.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }

    if (p !== c) {
      setMsg("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p });
    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("✅ Password updated. You can now sign in.");
    setTimeout(() => {
      window.location.href = "/signin";
    }, 800);
  }

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-md px-5 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Set a new password</h1>

        {!hasSession ? (
          <div className="mt-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <p className="text-sm text-white/70">
              This link may be invalid or expired. Please request a new reset link.
            </p>
            <a
              href="/reset-password"
              className="mt-5 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              Request new link
            </a>
          </div>
        ) : (
          <form
            onSubmit={updatePassword}
            className="mt-6 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10"
          >
            <label className="block text-sm text-white/80">New password</label>
            <div className="relative mt-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPass ? "text" : "password"}
                className="w-full rounded-xl bg-black/40 px-4 py-3 pr-12 text-sm text-white ring-1 ring-white/15 outline-none"
                placeholder="New password"
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

            <label className="mt-4 block text-sm text-white/80">Confirm new password</label>
            <div className="relative mt-2">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showConfirm ? "text" : "password"}
                className="w-full rounded-xl bg-black/40 px-4 py-3 pr-12 text-sm text-white ring-1 ring-white/15 outline-none"
                placeholder="Re-enter new password"
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
              {busy ? "Working..." : "Update password"}
            </button>

            {msg ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                {msg}
              </div>
            ) : null}
          </form>
        )}
      </section>
    </main>
  );
}
