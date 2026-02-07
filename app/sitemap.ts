import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";

  // For now we list the main pages.
  // Later, when your catalogue is database-driven, we'll also add dynamic track URLs here.
  const routes = [
    "",
    "/browse",
    "/membership",
    "/request",
    "/rights-holder",
    "/dmca",
    "/cart",
  ];

  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
