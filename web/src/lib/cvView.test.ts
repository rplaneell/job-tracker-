import { describe, expect, it } from "vitest";
import { contactLine, tailorState } from "./cvView";

const now = new Date("2026-11-18T12:00:00Z");
const ago = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

describe("tailorState", () => {
  it("is ready when there are no tasks", () => expect(tailorState([], now)).toBe("ready"));
  it("is queued while a task waits for Claude Code", () => expect(tailorState([{ status: "queued", claimed_at: null }], now)).toBe("queued"));
  it("is working while a task was claimed under 30 minutes ago", () => expect(tailorState([{ status: "claimed", claimed_at: ago(29) }], now)).toBe("working"));
  it("is ready again when a claim is 30 minutes old or more, or its date is unreadable", () => {
    expect(tailorState([{ status: "claimed", claimed_at: ago(30) }], now)).toBe("ready");
    expect(tailorState([{ status: "claimed", claimed_at: "garbage" }], now)).toBe("ready");
  });
  it("ignores finished and failed tasks", () => expect(tailorState([{ status: "done", claimed_at: ago(5) }, { status: "failed", claimed_at: null }], now)).toBe("ready"));
  it("prefers working over queued when both exist", () =>
    expect(tailorState([{ status: "queued", claimed_at: null }, { status: "claimed", claimed_at: ago(2) }], now)).toBe("working"));
});

describe("contactLine", () => {
  it("joins the details that exist", () => expect(contactLine({ email: "a@b.co", phone: "", location: "Barcelona, Spain" })).toBe("a@b.co · Barcelona, Spain"));
  it("is empty when there are none", () => expect(contactLine({ email: "", phone: "", location: "" })).toBe(""));
});
