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

function coverContentTypeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));

    const slug = String(body?.slug || "").trim();
    const kind = String(body?.kind || "").trim();
    const version = String(body?.version || "").trim();
    const filename = String(body?.filename || "").trim();

    if (!slug) return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    if (!isKind(kind)) return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
    if (kind !== "cover" && !isVersion(version)) {
      return NextResponse.json({ ok: false, error: "Invalid version" }, { status: 400 });
    }

    const bucket = "media";

    // Decide path + contentType
    let path = "";
    let contentType = "";

    if (kind === "cover") {
      const extRaw = getExt(filename) || "jpg";
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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Create signed upload URL token (upsert must be enabled here)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: true });

    if (error || !data?.token) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Could not create signed upload token", path },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, bucket, path, token: data.token, contentType },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}