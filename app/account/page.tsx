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

  const membershipLabel = useMemo(() => {
    if (!userEmail) return "Please log in to manage your account.";
    if (loading) return "Loading…";
    if (!ms?.ok) return "Membership status unavailable.";

    if (ms.isMember) {
      const until = ms.expires_at ? ` • valid until ${fmtDate(ms.expires_at)}` : "";
      const plan = ms.plan ? ` • ${ms.plan}` : "";
      return `Active member${plan}${until}`;
    }

    if (!ms.isMember && ms.expires_at) {
      return `Membership expired • last expiry was ${fmtDate(ms.expires_at)}`;
    }

    return "Not a member";
  }, [userEmail, loading, ms]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Account</h1>
        <p className="mt-1 text-sm text-white/70">
          Manage your email preferences, security, and account deletion requests.
        </p>
      </div>

      {/* If not logged in */}
      {!userEmail ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-white/80">{membershipLabel}</p>
          <a
            href="/signin"
            className="mt-4 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
          >
            Log in
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Profile */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Profile</h2>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              <div>
                <span className="text-white/60">Email:</span>{" "}
                <span className="font-medium text-white/90">{userEmail}</span>
              </div>
              <div>
                <span className="text-white/60">Membership:</span>{" "}
                <span className="font-medium text-white/90">{membershipLabel}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/membership"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Manage membership
              </a>
              <a
                href="/dashboard"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white ring-1 ring-white/15 hover:bg-white/15"
              >
                Go to dashboard
              </a>
            </div>
          </section>

          {/* Email preferences (placeholder for Step 2) */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Email preferences</h2>
            <p className="mt-2 text-sm text-white/70">
              Step 2 will add your marketing opt-in toggle here (transaction emails remain required).
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Marketing emails</span>
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs ring-1 ring-white/10">
                  Coming next
                </span>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-semibold text-white">Security</h2>
            <p className="mt-2 text-sm text-white/70">
              Use these controls to keep your account safe.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
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

            <p className="mt-3 text-xs text-white/55">
              (Optional hardening later: “Log out other devices” session revocation.)
            </p>
          </section>

          {/* Danger zone (placeholder for Step 3/4) */}
          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <h2 className="text-base font-semibold text-red-200">Danger zone</h2>
            <p className="mt-2 text-sm text-white/70">
              Account deletion will remove your login and anonymize your email in purchase/membership records for
              compliance.
            </p>

            <button
              type="button"
              disabled
              className="mt-4 inline-flex cursor-not-allowed rounded-xl bg-red-500/20 px-4 py-2 text-sm text-red-200 ring-1 ring-red-400/20"
              title="We will enable this in Step 3"
            >
              Delete account (Step 3)
            </button>

            <p className="mt-2 text-xs text-white/55">
              We’ll enable this only after the secure API route and confirmation flow are implemented.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}