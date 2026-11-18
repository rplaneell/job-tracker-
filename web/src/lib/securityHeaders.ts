/**
 * Browser hardening headers for every page. A full Content Security Policy is not here yet: the page has an inline theme
 * script and loads Google Fonts and Supabase, so a strict policy needs a hash and named origins first (see docs/SECURITY_CHECKLIST.md).
 * frame-ancestors is safe to set now and blocks clickjacking (showing the page inside another site).
 */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];
