import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/videos/:path*",
        headers: [
          { key: "Content-Type", value: "video/mp4" },
          { key: "Accept-Ranges", value: "bytes" },
        ],
      },
    ];
  },
};

export default nextConfig;
