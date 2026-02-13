import SiteHeader from "../../components/SiteHeader";
import CoverTile from "../../components/CoverTile";
import AutoDownload from "./AutoDownload";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

type Params = { slug: string };

function niceTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeVersion(v: unknown) {
  const val = Array.isArray(v) ? v[0] : v;
  if (val === "full-guide" || val === "instrumental" || val === "low-guide") return val;
  return "instrumental";
}

function versionLabel(v: string) {
  if (v === "full-guide") return "Practice track (full guide vocals)";
  if (v === "instrumental") return "Performance version (instrumental only)";
  if (v === "low-guide") return "Reduced vocals";
  return "Performance version (instrumental only)";
}

async function getMembershipStatusFromDb(email: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false as const, isActive: false, expiresAt: null as string | null };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Grab the latest active membership for this email
  const { data, error } = await supabase
    .from("memberships")
    .select("expires_at,status,plan")
    .eq("email", email)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Membership lookup error:", error);
    return { ok: false as const, isActive: false, expiresAt: null as string | null };
  }

  const row = data?.[0];
  const expiresAt = row?.expires_at ? String(row.expires_at) : null;

  if (!expiresAt) {
    return { ok: true as const, isActive: false, expiresAt: null as string | null };
  }

  const exp = new Date(expiresAt).getTime();
  const isActive = exp > Date.now();

  return { ok: true as const, isActive, expiresAt };
}

export default async function DownloadPage({
  params,
  searchParams,
}: {
  params: Params | Promise<Params>;
  searchParams?:
    | { [key: string]: string | string[] | undefined }
    | Promise<{ [key: string]: any }>;
}) {
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<Params>)
      : (params as Params);

  const sp =
    searchParams && typeof (searchParams as any)?.then === "function"
      ? await (searchParams as Promise<any>)
      : (searchParams as any) || {};

  const slug = resolvedParams?.slug ?? "";
  const v = normalizeVersion(sp?.v);

  const store = await cookies();
  const isMemberFlag = store.get("swp_member")?.value === "1";
  const memberEmail = store.get("swp_member_email")?.value || "";

  // Default block if no member cookie or no email
  let isMember = false;
  let expiresAt: string | null = null;

  if (isMemberFlag && memberEmail) {
    const m = await getMembershipStatusFromDb(memberEmail);
    isMember = m.isActive;
    expiresAt = m.expiresAt;
  }

  if (!isMember) {
    return (
      <main className="min-h-screen text-white">
        <SiteHeader />

        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Members-only download</h1>

          <p className="mt-4 text-sm text-white/70">
            Full-length karaoke videos are available to active members or after checkout.
          </p>

          {isMemberFlag && memberEmail && expiresAt ? (
            <div className="mx-auto mt-6 max-w-lg rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
              <div className="text-sm font-semibold">Membership expired</div>
              <p className="mt-2 text-sm text-white/70">
                Your membership for <span className="text-white">{memberEmail}</span> has expired.
              </p>
              <p className="mt-2 text-xs text-white/55">
                Expired on: <span className="text-white">{new Date(expiresAt).toLocaleString()}</span>
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href="/membership"
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
            >
              View membership plans
            </a>

            <a
              href={`/track/${slug}`}
              className="rounded-2xl bg-white/10 px-6 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Back to track
            </a>
          </div>
        </section>
      </main>
    );
  }

  const title = slug ? niceTitle(slug) : "Download";

  return (
    <main className="min-h-screen text-white">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Download</h1>

        <div className="mt-8 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-white/10">
              <CoverTile slug={slug} className="h-full w-full" />
            </div>
            <div>
              <div className="text-lg font-semibold">{title}</div>
              <div className="mt-1 text-sm text-white/60">
                Version: <span className="text-white">{versionLabel(v)}</span>
              </div>
              {memberEmail ? (
                <div className="mt-1 text-xs text-white/55">
                  Member: <span className="text-white">{memberEmail}</span>
                </div>
              ) : null}
            </div>
          </div>

          <AutoDownload slug={slug} version={v} />

          <a
            href={`/track/${slug}`}
            className="mt-6 inline-block rounded-2xl bg-white/10 px-5 py-3 text-sm ring-1 ring-white/15 hover:bg-white/15"
          >
            Back to track
          </a>
        </div>
      </section>
    </main>
  );
}
