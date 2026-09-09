import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "provincial-lenses-delhi-cotton.trycloudflare.com",
    "127.0.0.1",
    "localhost",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.trycloudflare.com",
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
