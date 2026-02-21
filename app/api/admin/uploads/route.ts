import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VersionKey = "full-guide" | "instrumental" | "low-guide";
type KindKey = "preview" | "full" | "cover";

function isVersion(v: any): v is VersionKey {
  return v === "full-guide" || v === "instrumental" || v === "low-guide";
}
function isKind(k: any): k is KindKey {
  return k === "preview" || k === "full" || k === "cover";
}

function getExt(name: string) {
  const n = (name || "").trim();
  if (!n.includes(".")) return "";
  return n.split(".").pop()!.toLowerCase();
}

function isLikelyImage(fileType: string, name: string) {
  const t = (fileType || "").toLowerCase();
  if (t.startsWith("image/")) return true;
  const ext = getExt(name);
  return ["jpg", "jpeg", "png", "webp"].includes(ext);
}

function isLikelyVideo(fileType: string, name: string) {
  const t = (fileType || "").toLowerCase();
  if (t.startsWith("video/")) return true;
  if (t === "application/octet-stream") return true;
  const ext = getExt(name);
  return ["mp4", "m4v"].includes(ext);
}

function coverContentTypeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg"; // jpg/jpeg default
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }
    if (!serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const form = await req.formData();

    const slug = String(form.get("slug") || "").trim();
    const version = String(form.get("version") || "").trim();
    const kind = String(form.get("kind") || "").trim();
    const filenameFromForm = String(form.get("filename") || "").trim();
    const file = form.get("file");

    if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    if (!isKind(kind)) return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
    if (kind !== "cover" && !isVersion(version)) {
      return NextResponse.json({ ok: false, error: "Invalid version" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Use filename from form OR fallback to File.name
    const originalName = filenameFromForm || file.name || "";

    // Validate type (robust)
    if (kind === "cover") {
      if (!isLikelyImage(file.type, originalName)) {
        return NextResponse.json(
          {
            ok: false,
            error: `Cover must be an image (jpg/jpeg/png/webp). Got type="${file.type || "unknown"}" name="${originalName}"`,
          },
          { status: 400 }
        );
      }
    } else {
      if (!isLikelyVideo(file.type, originalName)) {
        return NextResponse.json(
          {
            ok: false,
            error: `File must be an MP4 video. Got type="${file.type || "unknown"}" name="${originalName}"`,
          },
          { status: 400 }
        );
      }
    }

    const bucket = "media";

    // Determine path + content type
    let path = "";
    let contentType = "";

    if (kind === "cover") {
      const extRaw = getExt(originalName) || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(extRaw) ? extRaw : "jpg";
      path = `covers/${slug}.${safeExt}`;
      contentType = coverContentTypeFromExt(safeExt);
    } else {
      path =
        kind === "preview"
          ? `previews/${slug}-${version}-preview_web.mp4`
          : `full/${slug}-${version}-full.mp4`;
      contentType = "video/mp4";
    }

    // ✅ Critical fix: upload raw bytes (more reliable on Next/Vercel)
    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);

    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, path, bucket, kind, version },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { ok: true, path, bucket, kind, version },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}