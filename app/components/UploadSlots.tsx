"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";

type VersionKey = "full-guide" | "instrumental" | "low-guide";
type KindKey = "preview" | "full" | "cover";

type StatusResp = {
  ok: boolean;
  bucket?: string;
  preview?: Record<VersionKey, boolean>;
  full?: Record<VersionKey, boolean>;
  cover?: string | null;
  error?: string;
};

type Row = {
  key: string;
  kind: KindKey;
  version?: VersionKey;
  label: string;
  help: string;
  accept: string;
};

type SignedResp = {
  ok: boolean;
  bucket?: string;
  path?: string;
  token?: string;
  contentType?: string;
  error?: string;
};

export default function UploadSlots({ slug }: { slug: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Server truth (nice-to-have)
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // UI truth (instant feedback)
  const [uploadedKeys, setUploadedKeys] = useState<Record<string, boolean>>({});
  const [coverPath, setCoverPath] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () => [
      {
        key: "cover",
        kind: "cover",
        label: "Cover tile (image)",
        help: "Shown across the site (home, browse, track page, cart). Use JPG/PNG/WebP.",
        accept: "image/*",
      },

      {
        key: "preview-full-guide",
        kind: "preview",
        version: "full-guide",
        label: "Preview — Practice track",
        help: "30s watermark MP4",
        accept: "video/mp4,video/*",
      },
      {
        key: "preview-instrumental",
        kind: "preview",
        version: "instrumental",
        label: "Preview — Performance version",
        help: "30s watermark MP4",
        accept: "video/mp4,video/*",
      },
      {
        key: "preview-low-guide",
        kind: "preview",
        version: "low-guide",
        label: "Preview — Reduced vocals",
        help: "30s watermark MP4",
        accept: "video/mp4,video/*",
      },

      {
        key: "full-full-guide",
        kind: "full",
        version: "full-guide",
        label: "Full — Practice track",
        help: "Full MP4",
        accept: "video/mp4,video/*",
      },
      {
        key: "full-instrumental",
        kind: "full",
        version: "instrumental",
        label: "Full — Performance version",
        help: "Full MP4",
        accept: "video/mp4,video/*",
      },
      {
        key: "full-low-guide",
        kind: "full",
        version: "low-guide",
        label: "Full — Reduced vocals",
        help: "Full MP4",
        accept: "video/mp4,video/*",
      },
    ],
    []
  );

  function filePathForRow(row: Row) {
    if (row.kind === "cover") return coverPath; // server tells us exact ext path
    if (row.kind === "preview") return `previews/${slug}-${row.version}-preview_web.mp4`;
    return `full/${slug}-${row.version}-full.mp4`;
  }

  function isUploaded(row: Row) {
    if (uploadedKeys[row.key]) return true;

    if (!status?.ok) return false;

    if (row.kind === "cover") return !!status.cover;
    if (row.kind === "preview" && row.version) return !!status.preview?.[row.version];
    if (row.kind === "full" && row.version) return !!status.full?.[row.version];

    return false;
  }

  async function refreshStatus() {
    try {
      setStatusError(null);
      const res = await fetch(`/api/admin/uploads/status?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      const out = (await res.json().catch(() => ({}))) as StatusResp;

      if (!res.ok || !out?.ok) {
        setStatus(null);
        setStatusError(out?.error || `Could not load upload status (HTTP ${res.status})`);
        return;
      }

      setStatus(out);
      setCoverPath(out.cover ?? null);

      // Merge server truth INTO local truth (never downgrade)
      const serverTrue: Record<string, boolean> = {};
      for (const r of rows) {
        if (r.kind === "cover") serverTrue[r.key] = !!out.cover;
        if (r.kind === "preview" && r.version) serverTrue[r.key] = !!out.preview?.[r.version];
        if (r.kind === "full" && r.version) serverTrue[r.key] = !!out.full?.[r.version];
      }

      setUploadedKeys((prev) => {
        const merged = { ...prev };
        for (const k of Object.keys(serverTrue)) {
          if (serverTrue[k]) merged[k] = true;
        }
        return merged;
      });
    } catch (e: any) {
      setStatus(null);
      setStatusError(e?.message || "Could not load upload status");
    }
  }

  useEffect(() => {
    setUploadedKeys({});
    setCoverPath(null);
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function upload(row: Row, file: File) {
    setBusyKey(row.key);

    try {
      // 1) Get signed token + target path from server
      const signRes = await fetch("/api/admin/uploads/signed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          kind: row.kind,
          version: row.kind === "cover" ? null : row.version,
          filename: file.name,
        }),
      });

      const signOut = (await signRes.json().catch(() => ({}))) as SignedResp;

      if (!signRes.ok || !signOut?.ok || !signOut?.path || !signOut?.token) {
        console.error("SIGNED_UPLOAD_TOKEN_FAIL", { status: signRes.status, signOut });
        alert(signOut?.error || `Could not get signed upload token (HTTP ${signRes.status}).`);
        return;
      }

      const bucket = String(signOut.bucket || "media");
      const path = String(signOut.path);
      const token = String(signOut.token);
      const contentType = String(signOut.contentType || file.type || "");

      // 2) Upload directly to Supabase Storage (bypasses Vercel 413)
      const supabase = supabaseClient();
      const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, file, {
        contentType,
        upsert: true,
      });

      if (error) {
        console.error("UPLOAD_TO_SIGNED_URL_FAIL", error);
        alert(error.message || "Upload failed.");
        return;
      }

      // ✅ Instant UI update
      setUploadedKeys((prev) => ({ ...prev, [row.key]: true }));
      if (row.kind === "cover") setCoverPath(path);

      setToast(`Uploaded ✓ ${row.label}`);
      setTimeout(() => setToast(null), 1400);

      refreshStatus();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Upload failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteFile(row: Row) {
    const path = filePathForRow(row);
    if (!path) {
      alert("No file path found yet. Click Refresh status.");
      return;
    }

    const ok = window.confirm(`Delete this file?\n\n${path}`);
    if (!ok) return;

    setBusyKey(row.key);

    const res = await fetch("/api/admin/uploads/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });

    const out = await res.json().catch(() => ({}));
    setBusyKey(null);

    if (!res.ok || !out?.ok) {
      console.error(out);
      alert(out?.error || "Delete failed.");
      return;
    }

    setUploadedKeys((prev) => ({ ...prev, [row.key]: false }));
    if (row.kind === "cover") setCoverPath(null);

    setToast("Deleted ✓");
    setTimeout(() => setToast(null), 1200);

    refreshStatus();
  }

  return (
    <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
      <div className="text-lg font-semibold">Uploads</div>
      <p className="mt-2 text-sm text-white/65">
        Upload cover tile + previews and full MP4 videos. Large files upload directly to Supabase (no Vercel limits).
      </p>

      {statusError ? (
        <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15">
          ❌ {statusError}
        </div>
      ) : null}

      {toast ? (
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15">
            <span>✅</span>
            <span>{toast}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        {rows.map((row) => {
          const uploaded = isUploaded(row);
          const busy = busyKey === row.key;

          const pathDisplay =
            row.kind === "cover"
              ? coverPath ?? `covers/${slug}.jpg (or .png/.webp)`
              : filePathForRow(row);

          return (
            <div
              key={row.key}
              className={[
                "rounded-2xl p-4 ring-1",
                uploaded ? "bg-emerald-500/10 ring-emerald-400/20" : "bg-white/5 ring-white/10",
              ].join(" ")}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">{row.label}</div>
                    {uploaded ? (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200 ring-1 ring-emerald-400/20">
                        Uploaded ✓
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 ring-1 ring-white/15">
                        Not uploaded
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-white/60">{row.help}</div>

                  <div className="mt-2 text-xs text-white/60">
                    Path: <span className="text-white/80 break-all">{pathDisplay}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    className={[
                      "inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm ring-1",
                      busy
                        ? "bg-white/10 text-white/50 ring-white/10 cursor-not-allowed"
                        : uploaded
                        ? "bg-white/10 text-white ring-white/15 hover:bg-white/15"
                        : "bg-white text-black ring-white/0 hover:bg-white/90",
                    ].join(" ")}
                    title={uploaded ? "Replace file" : "Upload file"}
                  >
                    {busy ? "Working..." : uploaded ? "Replace" : "Upload"}
                    <input
                      type="file"
                      accept={row.accept}
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        upload(row, f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  {uploaded ? (
                    <button
                      disabled={busy}
                      onClick={() => deleteFile(row)}
                      className={[
                        "rounded-xl px-4 py-2 text-sm ring-1",
                        busy
                          ? "bg-white/10 text-white/50 ring-white/10 cursor-not-allowed"
                          : "bg-white/10 text-white ring-white/15 hover:bg-white/15",
                      ].join(" ")}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          onClick={refreshStatus}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15"
        >
          Refresh status
        </button>
      </div>
    </div>
  );
}