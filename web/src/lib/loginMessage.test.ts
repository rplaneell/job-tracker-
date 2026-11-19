import { describe, expect, it } from "vitest";
import { loginMessage } from "./loginMessage";

describe("loginMessage", () => {
  it("says to wait when too many links were asked for", () => {
    expect(loginMessage({ status: 429 })).toMatch(/wait about a minute/i);
    expect(loginMessage({ code: "over_email_send_rate_limit" })).toMatch(/wait about a minute/i);
  });
  it("keeps the owner email hint for any other send error", () => {
    expect(loginMessage({ status: 400 })).toMatch(/owner email/i);
    expect(loginMessage({})).toMatch(/owner email/i);
  });
  it("explains a link that could not sign in, and tells to use the same browser", () => {
    expect(loginMessage({ page: "link" })).toMatch(/same browser/i);
  });
  it("shows nothing when there is no problem", () => {
    expect(loginMessage(null)).toBeNull();
  });
  it("never repeats text from the address bar", () => {
    expect(loginMessage({ page: "<script>alert(1)</script>" })).toBeNull();
  });
});
