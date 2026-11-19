import { describe, expect, it } from "vitest";
import { callbackProblem, loginMessage } from "./loginMessage";

describe("loginMessage", () => {
  it("shows nothing when there is no problem", () => {
    expect(loginMessage(null)).toBeNull();
  });
  it("says a GitHub account that is not the owner cannot enter", () => {
    expect(loginMessage("not-owner")).toMatch(/GitHub account is not the owner/i);
  });
  it("says a failed sign in can be tried again in the same browser", () => {
    expect(loginMessage("link")).toMatch(/same browser/i);
  });
  it("says when sign in could not start", () => {
    expect(loginMessage("start")).toMatch(/could not start/i);
  });
  it("never repeats text taken from the address bar", () => {
    expect(loginMessage("<script>alert(1)</script>")).toBeNull();
  });
});

describe("callbackProblem", () => {
  it("names a closed signup as not the owner", () => {
    expect(callbackProblem(new URLSearchParams("error=access_denied&error_code=signup_disabled"))).toBe("not-owner");
  });
  it("treats any other failure as a failed sign in", () => {
    expect(callbackProblem(new URLSearchParams("error=access_denied"))).toBe("link");
    expect(callbackProblem(new URLSearchParams(""))).toBe("link");
  });
});
