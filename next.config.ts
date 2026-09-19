import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["prisma", "@prisma/client"],
  // The Freebuff preview is reached through a proxied hostname (e.g.
  // 3000-<workspace>.daytonaproxy01.net), so Next.js dev resources (HMR,
  // dev overlay) would otherwise be blocked as cross-origin and the app
  // never hydrates in the preview. Allow the proxy subdomains in dev only.
  allowedDevOrigins: ["3000-0ae42d0a-a91a-42dc-b452-4460067eaf7b.daytonaproxy01.net", "*.daytonaproxy01.net"],
  
  experimental: { memoryBasedWorkersCount: true, optimizePackageImports: ["lucide-react", "recharts", "@radix-ui/react-icons"] },
  outputFileTracingRoot: path.resolve(__dirname),
  poweredByHeader: false,
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
