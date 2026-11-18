import { describe, expect, it } from "vitest";
import { ago, where } from "./labels";

const now = new Date("2026-11-18T12:00:00Z");

describe("ago", () => {
  it("reads days and months in plain words", () => {
    expect(ago("2026-11-18T08:00:00Z", now)).toBe("today");
    expect(ago("2026-11-17T08:00:00Z", now)).toBe("1 day ago");
    expect(ago("2026-11-08T12:00:00Z", now)).toBe("10 days ago");
    expect(ago("2026-05-18T12:00:00Z", now)).toBe("6 months ago");
  });
  it("handles a missing or broken date", () => {
    expect(ago(null, now)).toBe("no date");
    expect(ago("not a date", now)).toBe("no date");
  });
});

describe("where", () => {
  it("shows the city with the country code, or what is known", () => {
    expect(where("Basel", "Switzerland")).toBe("Basel, CH");
    expect(where(null, "Belgium")).toBe("Belgium");
    expect(where(null, null)).toBe("Location not stated");
  });
});
