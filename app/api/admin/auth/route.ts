import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { enforceSameOriginForMutations } from "../../../lib/security";

const COOKIE_NAME = "swp_admin";

function sign(payload: string, secret: string) {
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verify(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// GET = check if cookie is valid
export async function GET() {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD is not set on server." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value || "";

  let authed = false;
  if (token) {
    try {
      authed = verify(token, expected);
    } catch {
      authed = false;
    }
  }

  return NextResponse.json({ ok: true, authed });
}

// POST = login, set httpOnly cookie
export async function POST(req: Request) {
  // ✅ Same-origin protection for cookie-setting
  const sameOrigin = enforceSameOriginForMutations(req);
  if (!sameOrigin.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const password = String(body?.password || "");

    const expected = process.env.ADMIN_PASSWORD || "";
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_PASSWORD is not set on server." },
        { status: 500 }
      );
    }

    if (password !== expected) {
      return NextResponse.json({ ok: false, error: "Wrong password." }, { status: 401 });
    }

    // signed token: payload is timestamp (string)
    const payload = String(Date.now());
    const token = sign(payload, expected);

    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // 7 days
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE = logout, clear cookie
export async function DELETE(req: Request) {
  // ✅ Same-origin protection for cookie-clearing
  const sameOrigin = enforceSameOriginForMutations(req);
  if (!sameOrigin.ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}