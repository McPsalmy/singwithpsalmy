import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY TEST ROUTE (GET):
 * Open in browser like:
 * /api/admin/account-delete/approve-test?requestId=UUID_HERE
 *
 * This route simply calls the real POST route using fetch.
 * It helps novices test without Postman/Console.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestId = (url.searchParams.get("requestId") || "").trim();

    if (!requestId) {
      return NextResponse.json(
        { ok: false, error: "Missing requestId in query string" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Call the real POST endpoint, forwarding cookies (admin auth)
    const origin = `${url.protocol}//${url.host}`;

    const res = await fetch(`${origin}/api/admin/account-delete/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({ requestId }),
      cache: "no-store",
    });

    const out = await res.json().catch(() => ({}));

    return NextResponse.json(
      { ok: true, status: res.status, out },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}