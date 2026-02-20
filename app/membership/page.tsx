"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

const plans = [
  {
    name: "Bronze",
    pricePerMonth: 20000,
    months: 1,
    discountPct: 0,
    highlight: false,
    tagline: "Monthly access to the full catalog",
    accent: "from-amber-500/20 via-orange-500/10 to-fuchsia-500/10",
  },
  {
    name: "Silver",
    pricePerMonth: 15000,
    months: 3,
    discountPct: 25,
    highlight: true,
    tagline: "3-month plan with a solid discount",
    accent: "from-cyan-500/20 via-indigo-500/10 to-fuchsia-500/10",
  },
  {
    name: "Gold",
    pricePerMonth: 10000,
    months: 6,
    discountPct: 50,
    highlight: false,
    tagline: "6-month plan for serious practice",
    accent: "from-yellow-400/20 via-amber-500/10 to-indigo-500/10",
  },
  {
    name: "Platinum",
    pricePerMonth: 7500,
    months: 12,
    discountPct: 62.5,
    highlight: false,
    tagline: "Best value for the full year",
    accent: "from-fuchsia-500/20 via-indigo-500/10 to-cyan-500/10",
  },
];

type MembershipStatus = {
  ok: boolean;
  isMember: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function fmtDate(iso: string) {
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

export default function MembershipPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);

  const [checking, setChecking] = useState(true);
  const [ms, setMs] = useState<MembershipStatus | null>(null);

  // modal
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [planToBuy, setPlanToBuy] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fix: After cancelling Paystack and coming "back", React state can restore as busy/unresponsive.
  // Reset busy flags when page becomes visible again (bfcache/back button).
  useEffect(() => {
    function resetInteractiveState() {
      setBusyPlan(null);
      // keep email filled, but ensure UI is clickable again
    }

    const onPageShow = () => resetInteractiveState();
    const onVis = () => {
      if (!document.hidden) resetInteractiveState();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ✅ Membership status:
  // - ONLY show "active" when logged-in with a token.
  // - Logged-out users see a neutral banner (prevents stale "active" from cookies/previous session).
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setChecking(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token || "";

        // logged out: do NOT call membership status endpoint (it may read legacy cookies)
        if (!token) {
          if (!alive) return;
          setMs({ ok: true, isMember: false });
          // prefill from local for convenience (optional)
          const saved = localStorage.getItem("swp_email") || "";
          if (saved) setEmail(saved);
          return;
        }

        const res = await fetch("/api/public/membership/status", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });

        const out = (await res.json().catch(() => ({}))) as MembershipStatus;

        if (!alive) return;

        if (!res.ok || !out?.ok) {
          console.error(out);
          setMs({ ok: false, isMember: false, error: out?.error || "Could not check membership." });
          return;
        }

        setMs(out);

        const e = String(out?.email || "").trim();
        if (e) {
          setEmail(e);
          localStorage.setItem("swp_email", e);
        } else {
          const saved = localStorage.getItem("swp_email") || "";
          if (saved) setEmail(saved);
        }
      } finally {
        if (alive) setChecking(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase]);

  const banner = useMemo(() => {
    if (checking) return null;

    // If membership fetch errored
    if (ms && !ms.ok) {
      return {
        tone: "warn" as const,
        title: "Could not check membership",
        body: ms.error || "Please try again.",
      };
    }

    // If logged-out (we set ms ok + isMember false)
    // Show neutral message instead of "inactive"
    const { data: sessionData } = { data: null as any };
    // We can't read token here without re-requesting; so infer:
    // If ms.ok true and ms.email missing and isMember false => treat as logged-out banner.
    if (ms?.ok && !ms.email && !ms.isMember) {
      return {
        tone: "neutral" as const,
        title: "Membership status",
        body: "Log in to see your membership status and expiry date.",
      };
    }

    // Logged-in + member
    if (ms?.ok && ms.isMember) {
      return {
        tone: "good" as const,
        title: "Membership active",
        body: ms.expires_at ? `Active until ${fmtDate(ms.expires_at)}` : "Active membership detected.",
      };
    }

    // Logged-in + not member
    return {
      tone: "warn" as const,
      title: "No active membership",
      body: "Choose a plan to unlock full downloads and song requests.",
    };
  }, [checking, ms]);

  function startPlan(planName: string) {
    setError(null);
    setPlanToBuy(planName.toLowerCase());
    setShowEmail(true);
  }

  function closeModal() {
    if (busyPlan) return;
    setShowEmail(false);
    setPlanToBuy(null);
    setError(null);
  }

  async function confirmMembershipPayment() {
    setError(null);

    const e = email.trim();
    if (!e || !e.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!planToBuy) return;

    try {
      setBusyPlan(planToBuy);
      localStorage.setItem("swp_email", e);

      const res = await fetch("/api/payments/paystack/initialize-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, plan: planToBuy }),
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok || !out?.authorization_url) {
        setError(out?.error || "Could not start membership payment.");
        setBusyPlan(null);
        return;
      }

      // Redirect to Paystack
      window.location.href = out.authorization_url;
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setBusyPlan(null);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-6xl px-5 py-10">
        {/* Title (center) */}
        <div className="mx-auto max-w-2xl text-center">
          <a href="/" className="inline-flex items-center justify-center gap-2 text-xs text-white/60 hover:text-white">
            <span aria-hidden>←</span> Home
          </a>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Membership</h1>

          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Members get access to the full song catalog while their membership is active.
          </p>

          {/* Banner */}
          {banner ? (
            <div
              className={[
                "mt-4 rounded-3xl p-3 ring-1",
                banner.tone === "good"
                  ? "bg-emerald-500/10 ring-emerald-400/20"
                  : banner.tone === "neutral"
                  ? "bg-white/5 ring-white/10"
                  : "bg-white/5 ring-white/10",
              ].join(" ")}
            >
              <div className="text-sm font-semibold">{banner.title}</div>
              <div className="mt-1 text-sm text-white/70">{banner.body}</div>

              {/* If logged in, show email */}
              {ms?.email ? (
                <div className="mt-2 text-xs text-white/55">
                  Email: <span className="text-white">{ms.email}</span>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <a
                  href="/account"
                  className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                >
                  Account
                </a>
                <a
                  href="/browse"
                  className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                >
                  Browse songs
                </a>
              </div>
            </div>
          ) : null}

          {/* Single-purchase note (tighter spacing) */}
          <div className="mt-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Single-track purchase</div>
            <p className="mt-1 text-sm text-white/70">
              Buy any version of a track for a flat <span className="font-semibold text-white">₦700</span>.
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const total = p.pricePerMonth * p.months;
            const planKey = p.name.toLowerCase();

            return (
              <div
                key={p.name}
                className={[
                  "relative overflow-hidden rounded-3xl p-5 ring-1",
                  p.highlight ? "bg-transparent ring-white/20" : "bg-transparent ring-white/10",
                ].join(" ")}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${p.accent}`} />

                {p.discountPct > 0 ? (
                  <div className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/15">
                    Save {p.discountPct}%
                  </div>
                ) : null}

                <div className="relative text-center">
                  <div className="text-sm text-white/60">{p.name}</div>

                  <div className="mt-1 text-3xl font-semibold tracking-tight">
                    {formatNaira(p.pricePerMonth)}
                    <span className="text-sm font-normal text-white/60"> / month</span>
                  </div>

                  <p className="mt-2 text-sm text-white/70">{p.tagline}</p>

                  <div className="mx-auto mt-4 rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
                    <div className="text-xs text-white/60">Billed today</div>
                    <div className="mt-1 text-sm font-semibold">
                      {p.months === 1 ? formatNaira(p.pricePerMonth) : formatNaira(total)}
                      {p.months > 1 ? (
                        <span className="text-xs font-normal text-white/60"> (covers {p.months} months)</span>
                      ) : null}
                    </div>
                  </div>

                  <ul className="mx-auto mt-4 space-y-2 text-left text-sm text-white/70">
                    <li className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      Full catalog access while active
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      All available track versions
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      Members-only song requests
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      Renew manually when it expires
                    </li>
                  </ul>

                  <button
                    onClick={() => startPlan(p.name)}
                    disabled={busyPlan !== null}
                    className={[
                      "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
                      busyPlan ? "bg-white/60 text-black cursor-not-allowed" : "bg-white text-black hover:bg-white/90",
                    ].join(" ")}
                  >
                    {busyPlan === planKey ? "Redirecting..." : `Choose ${p.name}`}
                  </button>

                  <p className="mt-2 text-xs text-white/55">
                    Access unlocks immediately after successful payment.
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefit block (center) */}
        <div className="mt-8 rounded-3xl bg-white/5 p-3 ring-1 ring-white/10 text-center">
          <div className="text-xs text-white/60">Member benefit</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Request songs not in the catalogue</h2>
          <p className="mt-1 text-sm text-white/70">
            Active members can request karaoke practice tracks. We’ll create and upload them for you.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a
              href="/request"
              className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
            >
              Request a song
            </a>
            <a
              href="/browse"
              className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
            >
              Browse catalogue
            </a>
          </div>
        </div>

        {/* FAQ (left aligned as requested) */}
        <div className="mt-8 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold">Membership FAQs</h2>
          <div className="mt-3 space-y-3 text-left text-sm text-white/70">
            <p>
              <span className="font-semibold text-white">Does it auto-renew?</span>{" "}
              Not yet. For now, you renew manually when your membership expires.
            </p>
            <p>
              <span className="font-semibold text-white">Can I cancel anytime?</span>{" "}
              Yes. Since renewal is manual, you can simply choose not to renew.
            </p>
            <p>
              <span className="font-semibold text-white">Do I need an account?</span>{" "}
              No for single purchases. Accounts help us recognize your membership email reliably.
            </p>
          </div>
        </div>
      </section>

      {/* Email Modal */}
      {showEmail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-md rounded-3xl bg-[#0b0b0b] p-5 ring-1 ring-white/15">
            <div className="text-lg font-semibold">Membership email</div>
            <p className="mt-1 text-sm text-white/70">
              Enter the email address that will be used for membership access.
            </p>

            <div className="mt-4">
              <label className="text-xs text-white/70">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-white/40"
              />
            </div>

            {error ? (
              <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                ❌ {error}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={closeModal}
                disabled={!!busyPlan}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={confirmMembershipPayment}
                disabled={!!busyPlan}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
              >
                {busyPlan ? "Working..." : "Continue"}
              </button>
            </div>

            <p className="mt-3 text-xs text-white/55">
              Use the same email you’ll log in with on your account page.
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}