import type { NextConfig } from "next";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@yuvmi/shared"],
  async rewrites() {
    if (!apiBaseUrl) return [];
    return [{ source: "/api/:path*", destination: `${apiBaseUrl}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: "/manifesto/lab", destination: "/manifesto", permanent: true },
      { source: "/manifesto/secim", destination: "/manifesto", permanent: true },
      { source: "/manifesto/tasarimlar", destination: "/manifesto", permanent: true },
      { source: "/manifesto/aurora", destination: "/manifesto", permanent: true },
      { source: "/manifesto/studio", destination: "/manifesto", permanent: true },
      { source: "/manifesto/ozet", destination: "/manifesto", permanent: true },
      { source: "/manifesto/neon", destination: "/manifesto", permanent: true },
      { source: "/manifesto/zen", destination: "/manifesto", permanent: true },
      { source: "/manifesto/brutalist", destination: "/manifesto", permanent: true },
    ];
  },
};

export default nextConfig;
