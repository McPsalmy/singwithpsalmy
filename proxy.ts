import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "swp_admin";

async function hmacSha256Hex(secret: string, payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const bytes = new Uint8Array(sigBuf);

  // convert to hex string
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function isAuthed(req: NextRequest) {
  const secret = process.env.ADMIN_PASSWORD || "";
  if (!secret) return false;

  const token = req.cookies.get(COOKIE_NAME)?.value || "";
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expected = await hmacSha256Hex(secret, payload);
  if (sig.length !== expected.length) return false;

  // timing-safe-ish compare (good enough for middleware)
  let ok = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig.charCodeAt(i) !== expected.charCodeAt(i)) ok = false;
  }
  return ok;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow auth endpoint (login/logout/check)
  if (pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  const authed = await isAuthed(req);

  // Protect ALL admin API routes
  if (pathname.startsWith("/api/admin")) {
    if (!authed) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Make /admin pages look like they do not exist unless authed
  if (pathname.startsWith("/admin")) {
    if (!authed) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next();
  }

  // /psalmy remains accessible as your secret login page
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
