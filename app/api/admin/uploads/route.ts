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
    const filename = String(form.get("filename") || "").trim();
    const file = form.get("file");

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }
    if (!isKind(kind)) {
      return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
    }
    if (kind !== "cover" && !isVersion(version)) {
      return NextResponse.json({ ok: false, error: "Invalid version" }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
    }

    // Validate type
    if (kind === "cover") {
      const t = String(file.type || "");
      if (!t.startsWith("image/")) {
        return NextResponse.json({ ok: false, error: "Cover must be an image" }, { status: 400 });
      }
    } else {
      if (!String(file.type || "").includes("video")) {
        return NextResponse.json({ ok: false, error: "File must be a video" }, { status: 400 });
      }
    }

    const bucket = "media";

    let path = "";
    let contentType = file.type || (kind === "cover" ? "image/jpeg" : "video/mp4");

    if (kind === "cover") {
      const ext =
        filename && filename.includes(".")
          ? filename.split(".").pop()!.toLowerCase()
          : "jpg";

      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      path = `covers/${slug}.${safeExt}`;
    } else {
      path =
        kind === "preview"
          ? `previews/${slug}-${version}-preview_web.mp4`
          : `full/${slug}-${version}-full.mp4`;

      // Force mp4 content type for consistency
      contentType = "video/mp4";
    }

    // ✅ ACTUAL UPLOAD
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path, bucket });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
