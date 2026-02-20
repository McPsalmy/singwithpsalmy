"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

type StatusResp = {
  ok: boolean;
  isMember?: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

function fmt(iso?: string | null) {
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
    return iso;
  }
}

export default function DashboardPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusResp | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      // If no session, show logged-out state (no loop)
      if (!token) {
        if (!alive) return;
        setStatus({ ok: true, isMember: false });
        setLoading(false);
        return;
      }

      // Call membership status with Bearer token so server can verify identity
      const res = await fetch("/api/public/membership/status", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    }

    run();
    return () => {
      alive = false;
    };
  }, [supabase]);

  const loggedIn = !!status?.email;

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-white/65">
              Your account overview — membership status and access.
            </p>
          </div>

          <a
            href="/browse"
            className="inline-flex w-fit rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Browse songs
          </a>
        </div>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-lg font-semibold">Account</div>
          <div className="mt-1 text-sm text-white/65">
            Logged-in users are matched to membership by email.
          </div>

          {loading ? (
            <div className="mt-4 text-sm text-white/70">Loading…</div>
          ) : !status?.ok ? (
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
              ❌ {status?.error || "Unknown error"}
            </div>
          ) : !loggedIn ? (
            <div className="mt-5">
              <div className="text-sm text-white/70">You’re not logged in yet.</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="/signin"
                  className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Log in
                </a>
                <a
                  href="/signup"
                  className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                >
                  Create account
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Signed-in email</div>
                <div className="mt-1 text-sm font-semibold break-all">{status.email}</div>
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Membership</div>
                <div className="mt-1 text-sm font-semibold">
                  {status.isMember ? "Active" : "Not active"}
                </div>
                <div className="mt-1 text-xs text-white/60">
                  Plan: {status.plan ?? "—"} • Expires: {fmt(status.expires_at)}
                </div>
              </div>

              <div className="md:col-span-2 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Next</div>
                <div className="mt-1 text-sm text-white/70">
                  We’ll add your <span className="text-white">order history</span> here so you can re-download
                  purchases anytime.
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="/membership"
                    className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Manage membership
                  </a>
                  <a
                    href="/request"
                    className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Request a song
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}