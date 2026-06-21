import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep puppeteer-core external so the bundler doesn't try to trace/bundle its
  // native bits into the /api/pdf route.
  serverExternalPackages: ["puppeteer-core"],
  async headers() {
    return [
      {
        // The service worker must be served as JS and never cached, so updates
        // are picked up immediately. (No X-Frame-Options here — it would break
        // the dev preview iframe and isn't needed for PWA install.)
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
