export const dynamic = "force-dynamic";

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
  const base = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const url = `${base.replace(/\/$/, "")}/api/public/membership/status`;

  let data: StatusResp | null = null;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      // IMPORTANT: include cookies so server can read Supabase session
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    data = (await res.json().catch(() => null)) as StatusResp | null;

    if (!res.ok || !data?.ok) {
      data = { ok: false, error: data?.error || `Failed (HTTP ${res.status})` };
    }
  } catch (e: any) {
    data = { ok: false, error: e?.message || "Could not reach server." };
  }

  const loggedIn = !!data?.email;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-white/65">
          Your account overview (membership status first — order history comes next).
        </p>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-lg font-semibold">Account</div>

          {!data?.ok ? (
            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
              ❌ {data?.error || "Unknown error"}
            </div>
          ) : !loggedIn ? (
            <div className="mt-4">
              <div className="text-sm text-white/70">
                You’re not logged in.
              </div>
              <a
                href="/signin"
                className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Log in
              </a>
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <div>
                Email: <span className="text-white">{data.email}</span>
              </div>
              <div>
                Membership:{" "}
                <span className="text-white">
                  {data.isMember ? "Active" : "Not active"}
                </span>
              </div>
              <div>
                Plan: <span className="text-white">{data.plan ?? "—"}</span>
              </div>
              <div>
                Expires: <span className="text-white">{fmt(data.expires_at)}</span>
              </div>

              <div className="pt-4">
                <a
                  href="/membership"
                  className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                >
                  Manage membership
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-white/50">
          Next: we’ll add your order history here.
        </div>
      </div>
    </main>
  );
}