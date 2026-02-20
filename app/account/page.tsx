"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuthClient } from "../lib/supabaseAuthClient";

type StatusResp = {
  ok: boolean;
  isMember?: boolean;
  email?: string;
  expires_at?: string | null;
  plan?: string | null;
  error?: string;
};

type DeleteReqResp = {
  ok: boolean;
  error?: string;
};

function fmtDate(iso?: string | null) {
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
    return String(iso);
  }
}

export default function AccountPage() {
  const supabase = useMemo(() => supabaseAuthClient(), []);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Security (password update)
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [showP1, setShowP1] = useState(false);
  const [showP2, setShowP2] = useState(false);
  const [secBusy, setSecBusy] = useState(false);
  const [secMsg, setSecMsg] = useState<string | null>(null);

  // Delete request
  const [delReason, setDelReason] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delMsg, setDelMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email ?? null;

      if (!alive) return;
      setUserEmail(email);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      if (!token) {
        setStatus({ ok: true, isMember: false });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/public/membership/status", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });

      const out = (await res.json().catch(() => null)) as StatusResp | null;

      if (!alive) return;

      if (!res.ok || !out?.ok) {
        setStatus({ ok: false, error: out?.error || `Failed (HTTP ${res.status})` });
        setLoading(false);
        return;
      }

      setStatus(out);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [supabase]);

  const loggedIn = !!userEmail;
  const isMember = !!status?.isMember;

  async function logout() {
    const ok = confirm("Log out of your account?");
    if (!ok) return;

    try {
      await supabase.auth.signOut();
    } finally {
      // clear legacy cookies too
      try {
        await fetch("/api/public/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/";
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setSecMsg(null);

    const a = p1.trim();
    const b = p2.trim();

    if (!loggedIn) {
      setSecMsg("Please log in first.");
      return;
    }

    if (a.length < 6) {
      setSecMsg("Password must be at least 6 characters.");
      return;
    }
    if (a !== b) {
      setSecMsg("Passwords do not match.");
      return;
    }

    setSecBusy(true);
    const { error } = await supabase.auth.updateUser({ password: a });
    setSecBusy(false);

    if (error) {
      setSecMsg(error.message || "Could not update password.");
      return;
    }

    setP1("");
    setP2("");
    setSecMsg("✅ Password updated.");
  }

  async function submitDeleteRequest() {
    setDelMsg(null);

    if (!loggedIn) {
      setDelMsg("Please log in first.");
      return;
    }

    const ok = confirm(
      "Submit an account deletion request?\n\nThis will notify support. Your account won’t be deleted instantly."
    );
    if (!ok) return;

    setDelBusy(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || "";

      if (!token) {
        setDelBusy(false);
        setDelMsg("Please log in again.");
        return;
      }

      const res = await fetch("/api/public/account/delete-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: delReason.trim() || undefined }),
      });

      const out = (await res.json().catch(() => null)) as DeleteReqResp | null;

      setDelBusy(false);

      if (!res.ok || !out?.ok) {
        setDelMsg(out?.error || `Failed (HTTP ${res.status}). You can use email support below.`);
        return;
      }

      setDelReason("");
      setDelMsg("✅ Request submitted. We’ll email you to confirm.");
    } catch (e: any) {
      setDelBusy(false);
      setDelMsg(e?.message || "Request failed. You can use email support below.");
    }
  }

  const mailtoHref =
    "mailto:support@singwithpsalmy.com?subject=Delete%20my%20account&body=" +
    encodeURIComponent(
      `Please delete my SingWithPsalmy account.\n\nSigned-in email: ${userEmail ?? ""}\nReason (optional): ${delReason.trim()}\n`
    );

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
            >
              <span aria-hidden>←</span> Home
            </a>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Account</h1>
            <p className="mt-2 text-sm text-white/65">Your membership details and account actions.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard"
              className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
            >
              Purchase history
            </a>

            {loggedIn ? (
              <button
                onClick={logout}
                className="inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                title={userEmail ?? "Log out"}
              >
                Log out
              </button>
            ) : (
              <a
                href="/signin"
                className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Log in
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Identity */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Signed-in email</div>

            {loading ? (
              <div className="mt-4 text-sm text-white/70">Loading…</div>
            ) : loggedIn ? (
              <div className="mt-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Email</div>
                <div className="mt-1 text-sm font-semibold break-all">{userEmail}</div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/70">
                You’re not logged in yet.
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/signin"
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    Log in
                  </a>
                  <a
                    href="/signup"
                    className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Create account
                  </a>
                </div>
              </div>
            )}

            <div className="mt-5 text-xs text-white/55">
              Tip: membership is recognized when you log in with the same email used for payment.
            </div>
          </div>

          {/* Membership */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Membership</div>

            {loading ? (
              <div className="mt-4 text-sm text-white/70">Checking membership…</div>
            ) : !status?.ok ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                ❌ {status?.error || "Could not load membership status."}
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-white/60">Status</div>
                  <div className="mt-1 text-sm font-semibold">{isMember ? "Active" : "Not active"}</div>

                  <div className="mt-2 text-xs text-white/60">
                    Plan: <span className="text-white">{status.plan ?? "—"}</span> • Expires:{" "}
                    <span className="text-white">{fmtDate(status.expires_at)}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/membership"
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
                  >
                    {isMember ? "Manage / renew" : "Join membership"}
                  </a>
                  <a
                    href="/request"
                    className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                  >
                    Request a song
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Security (password update) */}
          <div className="md:col-span-2 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Security</div>
            <p className="mt-2 text-sm text-white/65">
              Update your password anytime. If you forgot it, reset by email.
            </p>

            {!loggedIn ? (
              <div className="mt-5 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm text-white/70">
                  You’re not logged in. Use reset password to set a new one.
                </div>
                <a
                  href="/reset-password"
                  className="mt-4 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Reset password
                </a>
              </div>
            ) : (
              <form onSubmit={changePassword} className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-white/60">New password</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={p1}
                      onChange={(e) => setP1(e.target.value)}
                      type={showP1 ? "text" : "password"}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowP1((v) => !v)}
                      className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs ring-1 ring-white/15 hover:bg-white/15"
                    >
                      {showP1 ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-white/60">Confirm new password</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={p2}
                      onChange={(e) => setP2(e.target.value)}
                      type={showP2 ? "text" : "password"}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowP2((v) => !v)}
                      className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs ring-1 ring-white/15 hover:bg-white/15"
                    >
                      {showP2 ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                  {secMsg ? (
                    <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                      {secMsg}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={secBusy}
                      className={[
                        "rounded-2xl px-5 py-3 text-sm font-semibold",
                        secBusy
                          ? "bg-white/10 text-white/60 ring-1 ring-white/10"
                          : "bg-white text-black hover:bg-white/90",
                      ].join(" ")}
                    >
                      {secBusy ? "Updating..." : "Update password"}
                    </button>

                    <a
                      href="/reset-password"
                      className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                    >
                      Reset by email
                    </a>
                  </div>

                  <div className="text-xs text-white/55">
                    Tip: Choose a strong password you don’t reuse elsewhere.
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Delete account request */}
          <div className="md:col-span-2 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Delete account request</div>
            <p className="mt-2 text-sm text-white/65">
              Submit a request and we’ll confirm ownership by email before processing.
            </p>

            <div className="mt-4 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Reason (optional)</div>
              <textarea
                value={delReason}
                onChange={(e) => setDelReason(e.target.value)}
                className="mt-2 min-h-[96px] w-full resize-y rounded-xl bg-black/20 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/40"
                placeholder="Tell us why (optional). Example: I no longer use the service."
                maxLength={1000}
              />
              <div className="mt-2 text-xs text-white/50">
                This does not delete instantly — it creates a support request.
              </div>
            </div>

            {delMsg ? (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
                {delMsg}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={!loggedIn || delBusy}
                onClick={submitDeleteRequest}
                className={[
                  "rounded-2xl px-5 py-3 text-sm font-semibold ring-1",
                  !loggedIn || delBusy
                    ? "bg-white/10 text-white/60 ring-white/15 opacity-60"
                    : "bg-red-500/20 text-white ring-red-400/20 hover:bg-red-500/30",
                ].join(" ")}
                title={!loggedIn ? "Log in to submit a request" : "Submit delete request"}
              >
                {delBusy ? "Submitting..." : "Submit delete request"}
              </button>

              <a
                href={mailtoHref}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
                title="Fallback: email support"
              >
                Email support (fallback)
              </a>

              <a
                href="/dmca"
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/15"
              >
                DMCA / Rights help
              </a>
            </div>

            <div className="mt-3 text-xs text-white/55">
              We’ll confirm ownership and process it quickly.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}