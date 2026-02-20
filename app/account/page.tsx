"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

type MemberStatus = {
  ok: boolean;
  isMember: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AccountPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ms, setMs] = useState<MemberStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Load auth user
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = supabaseAuthClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setUserEmail(data?.user?.email ?? null);
      } catch {
        if (!cancelled) setUserEmail(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load membership status using bearer token if available
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const supabase = supabaseAuthClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token || "";

        const res = await fetch("/api/public/membership/status", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const out = (await res.json().catch(() => ({}))) as MemberStatus;
        if (cancelled) return;

        if (!res.ok || !out?.ok) {
          setMs(null);
        } else {
          setMs(out);
        }
      } catch {
        if (!cancelled) setMs(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const membershipPill = useMemo(() => {
    if (!userEmail) return { text: "Logged out", tone: "muted" as const };
    if (loading) return { text: "Checking…", tone: "muted" as const };

    if (!ms?.ok) return { text: "Status unavailable", tone: "muted" as const };

    if (ms.isMember) {
      const until = ms.expires_at ? ` • until ${fmtDate(ms.expires_at)}` : "";
      return { text: `Member${until}`, tone: "good" as const };
    }

    if (!ms.isMember && ms.expires_at) {
      return { text: `Expired • ${fmtDate(ms.expires_at)}`, tone: "warn" as const };
    }

    return { text: "Not a member", tone: "muted" as const };
  }, [userEmail, loading, ms]);

  const pillClass =
    membershipPill.tone === "good"
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
      : membershipPill.tone === "warn"
        ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"
        : "bg-white/10 text-white/80 ring-1 ring-white/15";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
      {/* Header row */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Account</h1>
          <p className="mt-1 text-sm text-white/60">Your profile & membership.</p>
        </div>

        <span className={`shrink-0 rounded-xl px-3 py-2 text-xs ${pillClass}`}>
          {membershipPill.text}
        </span>
      </div>

      {/* Logged out */}
      {!userEmail ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/75">Please log in to view your account.</p>
          <a
            href="/signin"
            className="mt-4 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
          >
            Log in
          </a>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Profile card */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Profile</h2>
              <span className="rounded-xl bg-white/10 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
                Signed in
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-wide text-white/50">Email</div>
              <div className="mt-1 break-all text-sm font-medium text-white/90">{userEmail}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/membership"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Membership
              </a>

              <a
                href="/reset-password"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Reset password
              </a>

              <a
                href="/update-password"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Update password
              </a>
            </div>
          </section>

          {/* Quick actions */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Quick actions</h2>

            <div className="mt-4 flex flex-col gap-2">
              <a
                href="/browse"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Browse songs
              </a>
              <a
                href="/request"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Request a song
              </a>
              <a
                href="/dashboard"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Purchase history
              </a>
            </div>

            <p className="mt-3 text-xs text-white/50">
              (We may remove this later if dashboard becomes redundant.)
            </p>
          </section>

          {/* Danger zone */}
          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-red-200">Delete account</h2>
                <p className="mt-1 text-xs text-white/55">
                  This will remove your login and anonymize your email in payment records.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-200 ring-1 ring-red-400/20"
                title="We will enable this after the secure delete API is added"
              >
                Delete account (coming soon)
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}