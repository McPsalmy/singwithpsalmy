export const dynamic = "force-dynamic";

import SiteHeader from "../components/SiteHeader";
import { cookies } from "next/headers";

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

export default async function DashboardPage() {
  // Fetch membership status using the SAME cookies from this request
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let data: StatusResp | null = null;

  try {
    const res = await fetch(
      `${process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ""}/api/public/membership/status`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieHeader,
        },
      }
    );

    data = (await res.json().catch(() => null)) as StatusResp | null;

    if (!res.ok || !data?.ok) {
      data = { ok: false, error: data?.error || `Failed (HTTP ${res.status})` };
    }
  } catch (e: any) {
    data = { ok: false, error: e?.message || "Could not reach server." };
  }

  const loggedIn = !!data?.email;

  const membershipLabel = data?.isMember ? "Active" : "Not active";
  const membershipTone = data?.isMember
    ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
    : "bg-white/10 text-white/70 ring-white/15";

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-white/65">
              Your account overview — membership status and downloads access.
            </p>
          </div>

          <a
            href="/browse"
            className="inline-flex w-fit rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Browse songs
          </a>
        </div>

        {/* Account Card */}
        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Account</div>
              <div className="mt-1 text-sm text-white/65">
                Sign in once, and your membership is recognized automatically by email.
              </div>
            </div>

            {data?.ok && loggedIn ? (
              <span
                className={[
                  "rounded-full px-3 py-1 text-xs ring-1",
                  membershipTone,
                ].join(" ")}
              >
                {membershipLabel}
              </span>
            ) : null}
          </div>

          {!data?.ok ? (
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
              ❌ {data?.error || "Unknown error"}
            </div>
          ) : !loggedIn ? (
            <div className="mt-5">
              <div className="text-sm text-white/70">
                You’re not logged in yet.
              </div>

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

              <div className="mt-4 text-xs text-white/50">
                Walk-in purchases still work without login. Accounts are for a smoother experience.
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Signed-in email</div>
                <div className="mt-1 text-sm font-semibold break-all">{data.email}</div>
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Membership</div>
                <div className="mt-1 text-sm font-semibold">{membershipLabel}</div>
                <div className="mt-1 text-xs text-white/60">
                  Plan: {data.plan ?? "—"} • Expires: {fmt(data.expires_at)}
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