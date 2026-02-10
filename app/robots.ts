import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/browse", "/track", "/request", "/dmca", "/rights-holder"],
        disallow: [
          "/admin",
          "/psalmy",
          "/api/admin",
          "/download",
          "/checkout",
          "/paystack",
          "/recover",
          "/cart",
          "/membership",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
