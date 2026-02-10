import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // If env vars aren't set (local misconfig), return a minimal sitemap
  if (!supabaseUrl || !serviceRoleKey) {
    return [
      { url: `${site}/`, lastModified: new Date() },
      { url: `${site}/browse`, lastModified: new Date() },
      { url: `${site}/request`, lastModified: new Date() },
      { url: `${site}/dmca`, lastModified: new Date() },
      { url: `${site}/rights-holder`, lastModified: new Date() },
    ];
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Only public, indexable pages. (Do NOT include /admin, /download, /recover, /checkout, /paystack)
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: new Date() },
    { url: `${site}/browse`, lastModified: new Date() },
    { url: `${site}/request`, lastModified: new Date() },
    { url: `${site}/dmca`, lastModified: new Date() },
    { url: `${site}/rights-holder`, lastModified: new Date() },
  ];

  const { data: tracks } = await supabase
    .from("tracks")
    .select("slug, created_at")
    .eq("is_active", true);

  const trackUrls: MetadataRoute.Sitemap =
    (tracks ?? []).map((t) => ({
      url: `${site}/track/${t.slug}`,
      lastModified: t.created_at ? new Date(t.created_at) : new Date(),
    })) || [];

  return [...staticUrls, ...trackUrls];
}
