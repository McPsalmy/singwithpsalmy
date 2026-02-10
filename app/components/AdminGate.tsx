"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
};

export default function AdminGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

   useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/auth", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const out = await res.json().catch(() => ({}));
        setOk(!!out?.authed);
      } catch {
        setOk(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function login() {
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/auth", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: pwd }),
});


      const out = await res.json().catch(() => ({}));

      if (!res.ok || !out?.ok) {
        setErr(out?.error || "Wrong password.");
        setBusy(false);
        return;
      }

      setOk(true);
      setPwd("");
    } catch (e: any) {
      setErr(e?.message || "Could not reach server.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
  try {
    await fetch("/api/admin/auth", {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    // even if request fails, we still log out locally
  }
  setOk(false);
}


  if (!ready) return null;

  if (!ok) {
    return (
      <main className="min-h-screen text-white">
        <section className="mx-auto max-w-md px-5 py-16">
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-xs text-white/60">Admin access</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Enter dashboard password
            </h1>

            <p className="mt-2 text-sm text-white/70">
              This area is private.
            </p>

            <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Password</div>
              <input
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") login();
                }}
                type="password"
                placeholder="Enter password"
                className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>

            {err ? (
              <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80 ring-1 ring-white/15">
                {err}
              </div>
            ) : null}

            <button
              type="button"
              disabled={busy || !pwd.trim()}
              onClick={login}
              className={[
                "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold",
                busy || !pwd.trim()
                  ? "bg-white/10 text-white/50 ring-1 ring-white/10 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90",
              ].join(" ")}
            >
              {busy ? "Checking..." : "Unlock"}
            </button>

            <p className="mt-4 text-xs text-white/50">
              Tip: Bookmark <span className="text-white/70">/psalmy</span>.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={logout}
        className="fixed bottom-5 right-5 z-50 rounded-2xl bg-white/10 px-4 py-2 text-xs text-white/80 ring-1 ring-white/15 hover:bg-white/15"
        title="Logout admin"
      >
        Logout
      </button>

      {children}
    </div>
  );
}
