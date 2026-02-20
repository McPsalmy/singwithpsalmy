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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Desktop "Legal" dropdown
  const [legalOpen, setLegalOpen] = useState(false);
  const legalRef = useRef<HTMLDivElement | null>(null);

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
  }, [userEmail]);

  // close legal dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!legalRef.current) return;
      if (!legalRef.current.contains(e.target as Node)) setLegalOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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

  // Member chip logic:
  // - only show "Member" if logged in AND membership matches email
  // - otherwise show "Join"
  const memberView = useMemo(() => {
    const msEmail = (ms?.email || "").trim().toLowerCase();
    const uEmail = (userEmail || "").trim().toLowerCase();

    const emailMatches = !!uEmail && !!msEmail && uEmail === msEmail;

    if (!uEmail) return { isMember: false, showMember: false };
    if (!emailMatches) return { isMember: false, showMember: false };

    return { isMember: !!ms?.isMember, showMember: !!ms?.isMember };
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
          {/* Account first (only when logged in) */}
          {userEmail ? (
            <a className="hover:text-white" href="/account">
              Account
            </a>
          ) : null}

          <a className="hover:text-white" href="/browse">
            Browse
          </a>
          <a className="hover:text-white" href="/membership">
            Membership
          </a>
          <a className="hover:text-white" href="/request">
            Request a song
          </a>

          {/* Legal dropdown */}
          <div ref={legalRef} className="relative">
            <button
              type="button"
              onClick={() => setLegalOpen((v) => !v)}
              className="hover:text-white"
              aria-label="Legal menu"
            >
              Legal <span className="text-white/60">▾</span>
            </button>

            {legalOpen ? (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-black/90 ring-1 ring-white/15 backdrop-blur">
                <a
                  href="/dmca"
                  className="block px-4 py-3 text-sm text-white/75 hover:bg-white/10 hover:text-white"
                  onClick={() => setLegalOpen(false)}
                >
                  DMCA
                </a>
                <a
                  href="/rights-holder"
                  className="block px-4 py-3 text-sm text-white/75 hover:bg-white/10 hover:text-white"
                  onClick={() => setLegalOpen(false)}
                >
                  Rights-holder
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
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <CartIcon />

          {/* ✅ Member status chip (replaces “Account” in right-side area) */}
          {memberView.showMember ? (
            <a
              href="/account"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              title="Member status"
            >
              <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400 align-middle" />
              Member
            </a>
          ) : (
            <a
              href="/membership"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
              title="Join membership"
            >
              Join
            </a>
          )}

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
        <div className="md:hidden border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-white/80 sm:px-5">
            <div className="flex flex-col gap-3">
              {userEmail ? (
                <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/account">
                  Account
                </a>
              ) : null}

              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/browse">
                Browse
              </a>
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/membership">
                Membership
              </a>
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/request">
                Request a song
              </a>

              <div className="mt-2 text-xs text-white/50">Legal</div>
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/dmca">
                DMCA
              </a>
              <a onClick={() => setMenuOpen(false)} className="hover:text-white" href="/rights-holder">
                Rights-holder
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
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}