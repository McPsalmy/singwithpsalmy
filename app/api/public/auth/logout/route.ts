import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Clear legacy membership cookies (these can cause "still member" UI when logged out)
  res.cookies.set("swp_member", "", { path: "/", maxAge: 0 });
  res.cookies.set("swp_member_email", "", { path: "/", maxAge: 0 });

  return res;
}