"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function SiteHeader() {
  const [ms, setMs] = useState<MemberStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement | null>(null);

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

  // close help dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!helpRef.current) return;
      if (!helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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
    const isMember = !!ms?.isMember;
    const msEmail = (ms?.email || "").trim().toLowerCase();
    const uEmail = (userEmail || "").trim().toLowerCase();
    const emailMatches = !!uEmail && !!msEmail && uEmail === msEmail;

    // If logged out, never show member badge
    if (!uEmail) return { show: false } as const;
    if (!emailMatches) return { show: false } as const;

    return { show: true, isMember } as const;
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

          {/* Help dropdown */}
          <div ref={helpRef} className="relative">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              className="hover:text-white"
            >
              Legal ▾
            </button>

            {helpOpen ? (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-black/90 ring-1 ring-white/15 backdrop-blur">
                <a
                  href="/dmca"
                  className="block px-4 py-3 text-sm text-white/75 hover:bg-white/10 hover:text-white"
                  onClick={() => setHelpOpen(false)}
                >
                  DMCA takedown
                </a>
                <a
                  href="/rights-holder"
                  className="block px-4 py-3 text-sm text-white/75 hover:bg-white/10 hover:text-white"
                  onClick={() => setHelpOpen(false)}
                >
                  Rights-holder contact
                </a>
              </div>
            ) : null}
          </div>
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            onClick={() => {
              setMenuOpen((v) => !v);
              setHelpOpen(false);
            }}
            aria-label="Open menu"
          >
            ☰
          </button>

          <CartIcon />

          {/* Membership badge (member only, no expiry text) */}
          {view.show && view.isMember ? (
            <a
              href="/account"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              title="Account"
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              Member
            </a>
          ) : null}

          {/* Auth */}
          {userEmail ? (
            <a
              href="/account"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              title={userEmail}
            >
              Account
            </a>
          ) : (
            <a
              href="/signin"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Log in
            </a>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen ? (
        <div className="md:hidden border-t border-white/10 bg-black/0">
          <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-white/80 sm:px-5">
            <div className="flex flex-col gap-3">
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/browse">
                Browse
              </a>
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/membership">
                Membership
              </a>
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/request">
                Request a song
              </a>

              <div className="h-px bg-white/10 my-1" />

              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/dmca">
                DMCA takedown
              </a>
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/rights-holder">
                Rights-holder contact
              </a>

              <div className="h-px bg-white/10 my-1" />

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
                <>
                  <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/account">
                    Account
                  </a>
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
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}