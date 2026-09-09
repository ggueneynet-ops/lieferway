import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com", "127.0.0.1:43123", "localhost:43123"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "127.0.0.1:43123", "localhost:43123"],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
