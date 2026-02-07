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

export default function MembershipPage() {
  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-center">
            Membership
          </h1>
          <p className="mt-3 text-base leading-relaxed text-white/70 text-center">
            Members get access to the full song catalog and all available versions
            while their subscription is active. Auto-renews, and you can cancel anytime.
          </p>
          <div className="mt-5 rounded-3xl bg-white/5 p-2 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Single-track purchase</div>
            <p className="mt-1 text-sm text-white/70">
              Not ready for membership? Buy any version of a track for a flat{" "}
              <span className="font-semibold text-white">₦700</span>.
            </p>
            <div className="mt-4 grid gap-2 text-sm text-white/70 md:grid-cols-3">

              <div className="rounded-2xl bg-white/5 p-2 text-center ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white">Practice track</div>
              <div className="mt-1 text-xs text-white/60">(full guide vocals)</div>
              </div>
              
              <div className="rounded-2xl bg-white/5 p-2 text-center ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white">Performance version</div>
              <div className="mt-1 text-xs text-white/60">(instrumental only)</div>
              </div>
              
              <div className="rounded-2xl bg-white/5 p-2 text-center ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white">Reduced vocals</div>
              <div className="mt-1 text-xs text-white/60">(low guide vocals)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const total = p.pricePerMonth * p.months;
            return (
              <div
                key={p.name}
                className={[
                  "relative rounded-3xl p-6 ring-1",
                  p.highlight
                    ? "bg-transparent ring-white/20"
                    : "bg-transparent ring-white/10",
                ].join(" ")}
              >
                <div className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${p.accent}`} />
                {p.discountPct > 0 && (
                  <div className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/15">
                    Save {p.discountPct}%
                  </div>
                )}

                <div className="text-sm text-white/60">{p.name}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatNaira(p.pricePerMonth)}
                  <span className="text-sm font-normal text-white/60">
                    {" "}
                    / month
                  </span>
                </div>

                <p className="mt-2 text-sm text-white/70">{p.tagline}</p>

                <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-white/60">
                    {p.months === 1 ? "Billed monthly" : "Billed today"}
                  </div>
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
                    Auto-renews, cancel anytime
                  </li>
                </ul>

                <button className="mt-8 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90">
                  Choose {p.name}
                </button>

                <p className="mt-3 text-xs text-white/55">
                  Payment & access control will be enabled at launch.
                </p>
              </div>
            );
          })}
        </div>

<div className="mt-10 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <div className="text-xs text-white/60 ">Member benefit</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">Request songs not in the catalogue</h2>
      <p className="mt-2 text-sm text-white/70">
        Active members can request karaoke practice tracks you want us to add next. We’ll create and upload them for you to download.
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
        <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">Members-only</span>
        <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">Priority uploads</span>
        <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">Grows the catalogue</span>
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


        <div className="mt-10 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <h2 className="text-lg font-semibold text-center">Membership FAQs</h2>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <p>
              <span className="font-semibold text-white">Does it auto-renew?</span>{" "}
              Yes. Each plan renews automatically at the end of its term, unless you cancel.
            </p>
            <p>
              <span className="font-semibold text-white">Can I cancel anytime?</span>{" "}
              Yes. You can stop renewal at your request. Access continues until the end of the paid period.
            </p>
            
          </div>
        </div>
      </section>
    </main>
  );
}
