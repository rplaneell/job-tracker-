import { describe, expect, it } from "vitest";
import { normalizeEmail } from "./normalizeEmail";

describe("normalizeEmail", () => {
  it("treats gmail.com and googlemail.com as the same address", () => {
    expect(normalizeEmail("rogerplanell@gmail.com")).toBe("rogerplanell@googlemail.com");
    expect(normalizeEmail("rogerplanell@googlemail.com")).toBe("rogerplanell@googlemail.com");
  });
  it("ignores capital letters and spaces around the address", () => {
    expect(normalizeEmail("  RogerPlanell@GMAIL.com ")).toBe("rogerplanell@googlemail.com");
  });
  it("leaves other providers alone", () => {
    expect(normalizeEmail("someone@example.com")).toBe("someone@example.com");
    expect(normalizeEmail("a@notgmail.com")).toBe("a@notgmail.com");
    expect(normalizeEmail("a@gmail.com.evil.example")).toBe("a@gmail.com.evil.example");
  });
  it("only changes the part after the last at sign", () => {
    expect(normalizeEmail("gmail.com@example.com")).toBe("gmail.com@example.com");
  });
  it("does not invent an address from nothing", () => {
    expect(normalizeEmail("")).toBe("");
    expect(normalizeEmail("no at sign")).toBe("no at sign");
  });
});
