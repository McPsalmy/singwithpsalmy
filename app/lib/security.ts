// app/lib/security.ts
import { NextResponse } from "next/server";

type RateState = { count: number; resetAt: number };
const mem = new Map<string, RateState>();

export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip =
    xff.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  return ip;
}

export function rateLimit(opts: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const cur = mem.get(opts.key);

  if (!cur || now > cur.resetAt) {
    const next = { count: 1, resetAt: now + opts.windowMs };
    mem.set(opts.key, next);
    return { ok: true, remaining: opts.limit - 1, resetAt: next.resetAt };
  }

  if (cur.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt };
  }

  cur.count += 1;
  mem.set(opts.key, cur);
  return { ok: true, remaining: opts.limit - cur.count, resetAt: cur.resetAt };
}

export function noStoreJson(body: any, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * POST/PUT/DELETE only:
 * If Origin/Referer exists and doesn't match our allowed site URL(s), reject.
 * This prevents basic CSRF-style cross-site POSTs.
 */
export function enforceSameOriginForMutations(req: Request) {
  const rawSite =
    (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "")
      .trim()
      .replace(/\/+$/, "");

  // If site isn't set, don't block (to avoid accidental lockout).
  if (!rawSite) return { ok: true as const };

  // Allow both www and non-www for your domain safely
  const allowedOrigins = new Set<string>();
  try {
    const u = new URL(rawSite);
    const baseOrigin = u.origin; // e.g. https://singwithpsalmy.com
    allowedOrigins.add(baseOrigin);

    // If the host starts with www., add non-www; otherwise add www.
    const host = u.host;
    const altHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    allowedOrigins.add(`${u.protocol}//${altHost}`);
  } catch {
    // If rawSite isn't a valid URL for some reason, fall back to strict string compare
    allowedOrigins.add(rawSite);
  }

  const origin = (req.headers.get("origin") || "").trim().replace(/\/+$/, "");
  const referer = (req.headers.get("referer") || "").trim();

  // If browser sends Origin, enforce allow-list.
  if (origin && !allowedOrigins.has(origin)) {
    return { ok: false as const, error: "Bad origin" };
  }

  // If no Origin but Referer exists, enforce prefix match against allow-list.
  if (!origin && referer) {
    const ok = Array.from(allowedOrigins).some((o) => referer.startsWith(o));
    if (!ok) return { ok: false as const, error: "Bad referer" };
  }

  return { ok: true as const };
}