import { describe, expect, it } from "vitest";
import { securityHeaders } from "./securityHeaders";

const get = (key: string) => securityHeaders.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

describe("securityHeaders", () => {
  it("stops the browser guessing file types", () => expect(get("X-Content-Type-Options")).toBe("nosniff"));
  it("refuses to be shown inside another site's page", () => {
    expect(get("X-Frame-Options")).toBe("DENY");
    expect(get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });
  it("does not leak full addresses to other sites", () => expect(get("Referrer-Policy")).toBe("strict-origin-when-cross-origin"));
  it("switches off browser features the app never uses", () => {
    const policy = get("Permissions-Policy") ?? "";
    for (const feature of ["camera=()", "microphone=()", "geolocation=()"]) expect(policy).toContain(feature);
  });
  it("forces HTTPS for a long time once the site is served over it", () => expect(get("Strict-Transport-Security")).toMatch(/max-age=\d{7,}/));
});
