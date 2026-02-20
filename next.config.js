/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // ✅ Keep your existing /videos headers
      {
        source: "/videos/:path*",
        headers: [
          { key: "Content-Type", value: "video/mp4" },
          { key: "Accept-Ranges", value: "bytes" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },

      // ✅ Security headers for the whole site (Paystack-safe)
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' https://js.paystack.co",
              "img-src 'self' data: https:",
              "media-src 'self' https:",
              "connect-src 'self' https: wss:",
              "frame-ancestors 'none'",
              "form-action 'self' https://paystack.com https://*.paystack.co",
              "frame-src 'self' https://js.paystack.co https://paystack.com https://*.paystack.co",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },

      // ✅ HSTS (safe on Vercel HTTPS)
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },

      // ✅ Never cache admin + APIs
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/psalmy", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

module.exports = nextConfig;