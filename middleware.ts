import type { NextRequest } from "next/server";
import { proxy, config as proxyConfig } from "./proxy";

// This middleware delegates ALL behavior to your existing proxy()
// so we don't change logic or break anything.
export async function middleware(req: NextRequest) {
  return proxy(req);
}

// Reuse the exact matcher rules you've already defined in proxy.ts
export const config = proxyConfig;