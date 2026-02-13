"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "../components/SiteHeader";

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

type MembershipStatus = {
  ok: boolean;
  isMember: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

export default function MembershipPage() {
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [planToBuy, setPlanToBuy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Membership banner
  const [checking, setChecking] = useState(true);
  const [ms, setMs] = useState<MembershipStatus | null>(null);

  // Load membership status from server (httpOnly cookies + DB)
  useEffect(() => {
    (async () => {
      try {
        setChecking(true);
        const res = await fetch("/api/public/membership/status", { cache: "no-store" });
        const out = (await res.json().catch(() => ({}))) as MembershipStatus;

        if (!res.ok || !out?.ok) {
          console.error(out);
          setMs({ ok: false, isMember: false, error: out?.error || "Could not check membership." });
          return;
        }

        setMs(out);

        // Prefill email from membership status first (best),
        // fallback to local saved email.
        const e = String(out?.email || "").trim();
        if (e) {
          setEmail(e);
          localStorage.setItem("swp_email", e);
        } else {
          const saved = localStorage.getItem("swp_email") || "";
          if (saved) setEmail(saved);
        }
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const banner = useMemo(() => {
    if (checking) return null;
    if (!ms?.ok) return null;

    if (ms.isMember) {
      return {
        tone: "good" as const,
        title: "Membership active",
        body: ms.expires_at
          ? `Active until ${fmtDate(ms.expires_at)}`
          : "Active membership detected.",
      };
    }

    // Not member (or expired)
    if (ms.email && ms.expires_at) {
      return {
        tone: "warn" as const,
        title: "Membership inactive",
        body: `No active membership found for ${ms.email}.`,
      };
    }

    return {
      tone: "warn" as const,
      title: "No active membership",
      body: "Choose a plan to unlock full downloads and song requests.",
    };
  }, [checking, ms]);

  function startPlan(planName: string) {
    setError(null);
    setPlanToBuy(planName.toLowerCase()); // bronze/silver/gold/platinum
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

      window.location.href = out.authorization_url;
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setBusyPlan(null);
    }
  }

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-center">Membership</h1>

          <p className="mt-3 text-base leading-relaxed text-white/70 text-center">
            Members get access to the full song catalog and all available versions while their
            membership is active.
          </p>

          {/* Membership status banner */}
          {banner ? (
            <div
              className={[
                "mt-6 rounded-3xl p-4 ring-1",
                banner.tone === "good"
                  ? "bg-emerald-500/10 ring-emerald-400/20"
                  : "bg-white/5 ring-white/10",
              ].join(" ")}
            >
              <div className="text-sm font-semibold">{banner.title}</div>
              <div className="mt-1 text-sm text-white/70">{banner.body}</div>
              {ms?.email ? (
                <div className="mt-2 text-xs text-white/55">
                  Email: <span className="text-white">{ms.email}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 rounded-3xl bg-white/5 p-2 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Single-track purchase</div>
            <p className="mt-1 text-sm text-white/70">
              Not ready for membership? Buy any version of a track for a flat{" "}
              <span className="font-semibold text-white">₦700</span>.
            </p>

           
          </div>
        </div>

        {/* Plans */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const total = p.pricePerMonth * p.months;
            const planKey = p.name.toLowerCase();

            return (
              <div
                key={p.name}
                className={[
                  "relative rounded-3xl p-6 ring-1",
                  p.highlight ? "bg-transparent ring-white/20" : "bg-transparent ring-white/10",
                ].join(" ")}
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${p.accent}`}
                />

                {p.discountPct > 0 && (
                  <div className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/15">
                    Save {p.discountPct}%
                  </div>
                )}

                <div className="text-sm text-white/60">{p.name}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatNaira(p.pricePerMonth)}
                  <span className="text-sm font-normal text-white/60"> / month</span>
                </div>

                <p className="mt-2 text-sm text-white/70">{p.tagline}</p>

                <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-white/60">Billed today</div>
                  <div className="mt-1 text-sm font-semibold">
                    {p.months === 1 ? formatNaira(p.pricePerMonth) : formatNaira(total)}
                    {p.months > 1 && (
                      <span className="text-xs font-normal text-white/60">
                        {" "}
                        (covers {p.months} months)
                      </span>
                    )}
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-sm text-white/70">
                  <li className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    Full catalog access while active
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    All available track versions
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    Members-only song requests
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    Renew manually when it expires
                  </li>
                </ul>

                <button
                  onClick={() => startPlan(p.name)}
                  disabled={busyPlan !== null}
                  className={[
                    "mt-8 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
                    busyPlan
                      ? "bg-white/60 text-black cursor-not-allowed"
                      : "bg-white text-black hover:bg-white/90",
                  ].join(" ")}
                >
                  {busyPlan === planKey
                    ? "Redirecting..."
                    : ms?.isMember
                    ? `Renew with ${p.name}`
                    : `Choose ${p.name}`}
                </button>

                <p className="mt-3 text-xs text-white/55">
                  You’ll get access immediately after successful payment.
                </p>
              </div>
            );
          })}
        </div>

        {/* Member benefit block */}
        <div className="mt-10 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs text-white/60 ">Member benefit</div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                Request songs not in the catalogue
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Active members can request karaoke practice tracks you want us to add next. We’ll
                create and upload them for you to download.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  Members-only
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  Priority uploads
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  Grows the catalogue
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href="/request"
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm text-center font-semibold ring-1 ring-white/15 hover:bg-white/15"
              >
                Request a song
              </a>
              <a
                href="/browse"
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm text-center font-semibold ring-1 ring-white/15 hover:bg-white/15"
              >
                Browse catalogue
              </a>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-10 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold text-center">Membership FAQs</h2>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <p>
              <span className="font-semibold text-white">Does it auto-renew?</span>{" "}
              Not yet. For now, you renew manually when your membership expires.
            </p>
            <p>
              <span className="font-semibold text-white">Can I cancel anytime?</span>{" "}
              Yes. Since renewal is manual, you can simply choose not to renew.
            </p>
          </div>
        </div>
      </section>

      {/* Email Modal */}
      {showEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-md rounded-3xl bg-[#0b0b0b] p-6 ring-1 ring-white/15">
            <div className="text-lg font-semibold">Membership email</div>
            <p className="mt-1 text-sm text-white/70">
              Enter the email address that will be used for membership access.
            </p>

            <div className="mt-5">
              <label className="text-xs text-white/70">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl bg-black/30 px-4 py-3 text-sm text-white ring-1 ring-white/10 outline-none placeholder:text-white/40"
              />
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                ❌ {error}
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
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
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
