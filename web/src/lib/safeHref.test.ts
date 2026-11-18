import { describe, expect, it } from "vitest";
import { safeHref } from "./safeHref";

describe("safeHref", () => {
  it("lets plain web links through", () => {
    expect(safeHref("https://jobs.example/acme/1")).toBe("https://jobs.example/acme/1");
    expect(safeHref("  http://example.com/x?a=1&b=2 ")).toBe("http://example.com/x?a=1&b=2");
  });
  it("turns anything that is not a plain web link into an empty string", () => {
    for (const bad of [
      "javascript:alert(1)", "JavaScript:alert(1)", " \tjavascript:alert(1)", "java\nscript:alert(1)",
      "data:text/html,<script>alert(1)</script>", "vbscript:x", "file:///etc/passwd", "//evil.example", "/relative",
      "mailto:a@b.c", "", "not a url", "https://" + "a".repeat(3000),
    ]) {
      expect(safeHref(bad), bad.slice(0, 30)).toBe("");
    }
  });
  it("copes with missing values", () => {
    expect(safeHref(null)).toBe("");
    expect(safeHref(undefined)).toBe("");
  });
});
