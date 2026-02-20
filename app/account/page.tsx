"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

type StatusResp = {
  ok: boolean;
  isMember?: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

export default function AccountPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? null;

      if (!alive) return;
      setUserEmail(email);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      if (!token) {
        setStatus({ ok: true, isMember: false });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/membership/status", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const out = (await res.json().catch(() => null)) as StatusResp | null;

      if (!alive) return;

      if (!res.ok || !out?.ok) {
        setStatus({ ok: false, error: out?.error || `Failed (HTTP ${res.status})` });
        setLoading(false);
        return;
      }

      setStatus(out);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [supabase]);

  const loggedIn = !!userEmail;
  const isMember = !!status?.isMember;

  async function logout() {
    const ok = confirm("Log out of your account?");
    if (!ok) return;

    try {
      await supabase.auth.signOut();
    } finally {
      // clear legacy cookies too
      try {
        await fetch("/api/public/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/";
    }
  }

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
              <span aria-hidden>←</span> Home
            </a>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Account</h1>
            <p className="mt-2 text-sm text-white/65">
              Your membership details and account actions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard"
              className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Purchase history
            </a>
            {loggedIn ? (
              <button
                onClick={logout}
                className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                title={userEmail ?? "Log out"}
              >
                Log out
              </button>
            ) : (
              <a
                href="/signin"
                className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Log in
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Identity */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Signed-in email</div>

            {loading ? (
              <div className="mt-4 text-sm text-white/70">Loading…</div>
            ) : loggedIn ? (
              <div className="mt-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Email</div>
                <div className="mt-1 text-sm font-semibold break-all">{userEmail}</div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/70">
                You’re not logged in yet.
                <div className="mt-4 flex gap-2">
                  <a
                    href="/signin"
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    Log in
                  </a>
                  <a
                    href="/signup"
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Create account
                  </a>
                </div>
              </div>
            )}

            <div className="mt-5 text-xs text-white/55">
              Tip: membership is recognized when you log in with the same email used for payment.
            </div>
          </div>

          {/* Membership */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Membership</div>

            {loading ? (
              <div className="mt-4 text-sm text-white/70">Checking membership…</div>
            ) : !status?.ok ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                ❌ {status?.error || "Could not load membership status."}
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-white/60">Status</div>
                  <div className="mt-1 text-sm font-semibold">
                    {isMember ? "Active" : "Not active"}
                  </div>

                  <div className="mt-2 text-xs text-white/60">
                    Plan: <span className="text-white">{status.plan ?? "—"}</span> • Expires:{" "}
                    <span className="text-white">{fmtDate(status.expires_at)}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/membership"
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    {isMember ? "Manage / renew" : "Join membership"}
                  </a>
                  <a
                    href="/request"
                    className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Request a song
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Delete account request (simple + clean) */}
          <div className="md:col-span-2 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Delete account request</div>
            <p className="mt-2 text-sm text-white/65">
              If you want your account removed, email us from your signed-in email address.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="mailto:support@singwithpsalmy.com?subject=Delete%20my%20account&body=Please%20delete%20my%20SingWithPsalmy%20account.%0A%0ASigned-in%20email%3A%20"
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
              >
                Email support
              </a>
              <a
                href="/dmca"
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
              >
                DMCA / Rights help
              </a>
            </div>

            <div className="mt-3 text-xs text-white/55">
              We’ll confirm ownership and process it quickly.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}