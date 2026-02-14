"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);
  const [password, setPassword] = useState("");
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

    if (password.trim().length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: password.trim() });
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
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-2 w-full rounded-xl bg-black/40 px-4 py-3 text-sm text-white ring-1 ring-white/15 outline-none"
              placeholder="New password"
              required
            />

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
