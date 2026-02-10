import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VersionKey = "full-guide" | "instrumental" | "low-guide";
const versions: VersionKey[] = ["full-guide", "instrumental", "low-guide"];

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing Supabase env vars" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const slug = String(url.searchParams.get("slug") || "").trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const bucket = "media";

    // list folders
    const { data: previews, error: e1 } = await supabase.storage
      .from(bucket)
      .list("previews", { limit: 1000 });

    const { data: full, error: e2 } = await supabase.storage
      .from(bucket)
      .list("full", { limit: 1000 });

    const { data: covers, error: e3 } = await supabase.storage
      .from(bucket)
      .list("covers", { limit: 1000 });

    if (e1 || e2 || e3) {
      return NextResponse.json(
        { ok: false, error: (e1 || e2 || e3)?.message || "List error" },
        { status: 500 }
      );
    }

    const previewSet = new Set((previews ?? []).map((x) => x.name));
    const fullSet = new Set((full ?? []).map((x) => x.name));

        const allowedCoverExts = new Set(["jpg", "jpeg", "png", "webp"]);

    const slugLower = slug.toLowerCase();

    // cover could be jpg/jpeg/png/webp; return the first matching filename (case-insensitive)
    const coverFile =
      (covers ?? []).find((x) => {
        const name = (x.name || "").toLowerCase();
        if (!name.startsWith(`${slugLower}.`)) return false;

        const ext = name.split(".").pop() || "";
        return allowedCoverExts.has(ext);
      })?.name || null;


    const preview: Record<VersionKey, boolean> = {
      "full-guide": previewSet.has(`${slug}-full-guide-preview_web.mp4`),
      instrumental: previewSet.has(`${slug}-instrumental-preview_web.mp4`),
      "low-guide": previewSet.has(`${slug}-low-guide-preview_web.mp4`),
    };

    const fullVideo: Record<VersionKey, boolean> = {
      "full-guide": fullSet.has(`${slug}-full-guide-full.mp4`),
      instrumental: fullSet.has(`${slug}-instrumental-full.mp4`),
      "low-guide": fullSet.has(`${slug}-low-guide-full.mp4`),
    };

    return NextResponse.json({
      ok: true,
      bucket,
      preview,
      full: fullVideo,
      cover: coverFile ? `covers/${coverFile}` : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
