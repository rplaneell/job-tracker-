import { describe, expect, it } from "vitest";
import { isPublicPath } from "./publicPaths";

describe("isPublicPath", () => {
  it("lets signed out people reach the login page and its callback", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
  });
  it("lets the logo and the tab icon load on the login page", () => {
    expect(isPublicPath("/brand/the-climb-mark.png")).toBe(true);
    expect(isPublicPath("/icon.png")).toBe(true);
  });
  it("keeps every data page private", () => {
    for (const p of ["/", "/hq", "/hq/assets/index.js", "/hq/models/office.glb", "/roles", "/cv", "/cv/123", "/pipeline", "/roles/abc", "/sources", "/practice"]) expect(isPublicPath(p)).toBe(false);
  });
  it("does not treat lookalike paths as public", () => {
    for (const p of ["/loginx", "/login-evil", "/brandx/secret", "/brand", "/icon.png.html", "/auth/callbackx", "/xbrand/a.png"]) expect(isPublicPath(p)).toBe(false);
  });
});
