import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/securityHeaders";

const config: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default config;
