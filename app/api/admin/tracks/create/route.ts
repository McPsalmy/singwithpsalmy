import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = String(body?.title || "").trim();
    const price_naira = Number(body?.price_naira ?? 700) || 700;

    if (!title) {
      return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
    }

    const slug = slugify(title);

    const { data, error } = await supabaseAdmin
      .from("tracks")
      .insert([
        {
          title,
          slug,
          price_naira,
          downloads: 0,
          is_active: true,
        },
      ])
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id, slug });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
