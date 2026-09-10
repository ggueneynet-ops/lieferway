import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.lhr.life",
    "*.loca.lt",
    "127.0.0.1",
    "localhost",
  ],
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: [
        "*.trycloudflare.com",
        "*.lhr.life",
        "*.loca.lt",
        "127.0.0.1:43123",
        "localhost:43123",
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [{ source: "/restaurants/:slug", destination: "/:slug" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Permissions-Policy", value: "geolocation=(self)" },
          { key: "Feature-Policy", value: 'geolocation \'self\'' },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
