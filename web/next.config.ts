import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const config: NextConfig = {
  devIndicators: false, // hides the small round Next.js badge shown only when running locally with npm run dev
  // the 3D office is built into public/hq by the prebuild step; this serves its page at /hq
  async rewrites() {
    return [{ source: "/hq", destination: "/hq/index.html" }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default config;
