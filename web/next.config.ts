import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const config: NextConfig = {
  devIndicators: false, // hides the small round Next.js badge shown only when running locally with npm run dev
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default config;
