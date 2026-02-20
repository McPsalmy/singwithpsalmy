"use client";

import { useEffect, useMemo, useState } from "react";
import CartIcon from "./CartIcon";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

type MemberStatus = {
  ok: boolean;
  isMember: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

function fmtExpiry(expiresAtIso: string) {
  const d = new Date(expiresAtIso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function daysUntil(expiresAtIso: string) {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function SiteHeader() {
  const [ms, setMs] = useState<MemberStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Supabase Auth user (for Log in / Log out UI)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const supabase = supabaseAuthClient();

        const { data } = await supabase.auth.getUser();
        if (!cancelled) setUserEmail(data?.user?.email ?? null);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setUserEmail(session?.user?.email ?? null);
        });

        return () => sub?.subscription?.unsubscribe?.();
      } catch {
        if (!cancelled) setUserEmail(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Membership status:
  // - Uses Bearer token when logged-in (authoritative)
  // - Falls back to cookie/legacy only when NOT logged-in
  useEffect(() => {
    let cancelled = false;

    (async () => {
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
          return;
        }

        setMs(out);
      } catch {
        if (!cancelled) setMs(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userEmail]); // refresh membership view when auth changes

  async function logout() {
    try {
      const supabase = supabaseAuthClient();
      await supabase.auth.signOut();
    } finally {
      // Clear legacy cookies so "member badge" can't stick when logged out
      try {
        await fetch("/api/public/auth/logout", { method: "POST" });
      } catch {
        // ignore
      }

      setUserEmail(null);
      setMs(null);
      window.location.href = "/";
    }
  }

  // Only show "member badge" when the authenticated user matches membership email
  const view = useMemo(() => {
    const expires = ms?.expires_at || null;
    const isMember = !!ms?.isMember;
    const msEmail = (ms?.email || "").trim().toLowerCase();
    const uEmail = (userEmail || "").trim().toLowerCase();

    const emailMatches = !!uEmail && !!msEmail && uEmail === msEmail;

    // If logged out, never show member badge based on leftover cookies
    if (!uEmail) {
      return { show: false } as const;
    }

    // If logged in but membership email doesn't match, hide membership badge to avoid confusion
    if (!emailMatches) {
      return { show: false } as const;
    }

    const hasAnyInfo = isMember || !!expires;
    if (!hasAnyInfo) return { show: false } as const;

    const expiryLabel = expires ? fmtExpiry(expires) : null;
    const dLeft = expires ? daysUntil(expires) : null;

    const nearExpiry = isMember && typeof dLeft === "number" && dLeft >= 1 && dLeft <= 7;
    const expired = !isMember && !!expires;

    return {
      show: true,
      isMember,
      expired,
      nearExpiry,
      expiryLabel,
      dLeft,
    } as const;
  }, [ms, userEmail]);

  return (
    <header className="border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
        {/* Brand */}
        <a href="/" className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Home">
          <img
            src="/brand/mark.png"
            alt="SingWithPsalmy"
            className="h-9 w-9 rounded-xl ring-1 ring-white/15 shadow-[0_0_25px_rgba(167,139,250,0.20)] transition hover:shadow-[0_0_33px_rgba(244,114,182,0.25)]"
          />
          <span className="hidden min-w-0 sm:block text-sm font-semibold tracking-wide text-white/90">
            <span className="block truncate">Sing With Psalmy</span>
            <span className="block text-xs text-white/60">Karaoke practice tracks</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          <a className="hover:text-white" href="/browse">
            Browse
          </a>
          <a className="hover:text-white" href="/membership">
            Membership
          </a>
          <a className="hover:text-white" href="/request">
            Request a song
          </a>

          {/* Show Dashboard only when logged in */}
          {userEmail ? (
            <a className="hover:text-white" href="/dashboard">
              Dashboard
            </a>
          ) : null}

          <a className="hover:text-white" href="/dmca">
            DMCA
          </a>
          <a className="hover:text-white" href="/rights-holder">
            Rights-holder
          </a>
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <CartIcon />

          {/* Auth */}
          {userEmail ? (
            <button
              onClick={logout}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              title={userEmail}
            >
              Log out
            </button>
          ) : (
            <>
              <div className="hidden md:flex items-center">
                <a
                  href="/signin"
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                >
                  Log in
                </a>
              </div>

              <a
                href="/signin"
                className="md:hidden rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              >
                Log in
              </a>
            </>
          )}

          {/* Membership area */}
          {view.show && view.isMember ? (
            <div className="flex items-center gap-2">
              <a
                href="/membership"
                className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                title="View membership"
              >
                <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 align-middle" />
                <span className="hidden sm:inline">
                  Member{view.expiryLabel ? ` (until ${view.expiryLabel})` : ""}
                </span>
                <span className="sm:hidden">Member</span>
              </a>

              {view.nearExpiry ? (
                <a
                  href="/membership"
                  className="rounded-xl bg-amber-500/20 px-3 py-2 text-sm text-amber-200 ring-1 ring-amber-400/20 hover:bg-amber-500/30"
                  title="Renew membership"
                >
                  <span className="hidden sm:inline">
                    Renew{typeof view.dLeft === "number" ? ` (${view.dLeft}d)` : ""}
                  </span>
                  <span className="sm:hidden">Renew</span>
                </a>
              ) : null}
            </div>
          ) : (
            <a
              href="/membership"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              <span className="hidden sm:inline">
                {view.show && view.expired ? "Renew membership" : "Join membership"}
              </span>
              <span className="sm:hidden">{view.show && view.expired ? "Renew" : "Join"}</span>
            </a>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen ? (
        <div className="md:hidden border-t border-white/10 bg-black/0">
          <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-white/80 sm:px-5">
            <div className="flex flex-col gap-3">
              
              {/* Dashboard visible on mobile too, only when logged in */}
              {userEmail ? (
                <a
                  onClick={() => setMenuOpen(false)}
                  className="hover:text-white"
                  href="/dashboard"
                >
                  Dashboard
                </a>
              ) : null}


              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/browse">
                Browse
              </a>
              <a
                onClick={() => setMenuOpen(false)}
                className="hover:text-white"
                href="/membership"
              >
                Membership
              </a>
              <a
                onClick={() => setMenuOpen(false)}
                className="hover:text-white"
                href="/request"
              >
                Request a song
              </a>

              {!userEmail ? (
                <>
                  <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/signin">
                    Log in
                  </a>
                  <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/signup">
                    Sign up
                  </a>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="text-left hover:text-white"
                  title={userEmail}
                >
                  Log out
                </button>
              )}

              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/dmca">
                DMCA
              </a>
              <a
                onClick={() => setMenuOpen(false)}
                className="hover:text-white"
                href="/rights-holder"
              >
                Rights-holder
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}