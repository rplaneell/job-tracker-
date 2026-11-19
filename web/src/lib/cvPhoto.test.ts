import { describe, expect, it } from "vitest";
import { MAX_PHOTO_CHARS, isJpegDataUrl, photoFor } from "./cvPhoto";

const OK = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

describe("isJpegDataUrl", () => {
  it("accepts a jpeg data address", () => expect(isJpegDataUrl(OK)).toBe(true));
  it.each([
    ["an svg image", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
    ["a png image", "data:image/png;base64,iVBORw0KGgo="],
    ["a script address", "javascript:alert(1)"],
    ["a web address", "https://example.com/me.jpg"],
    ["a value with a quote", 'data:image/jpeg;base64,abc"onerror="x'],
    ["a value with a space", "data:image/jpeg;base64,abc def"],
    ["a value with an angle bracket", "data:image/jpeg;base64,abc<script>"],
    ["an empty body", "data:image/jpeg;base64,"],
    ["an empty string", ""],
  ])("refuses %s", (_label, value) => expect(isJpegDataUrl(value)).toBe(false));
  it("refuses things that are not text", () => {
    for (const v of [null, undefined, 5, {}, [OK]]) expect(isJpegDataUrl(v)).toBe(false);
  });
  it("refuses a photo over the size limit", () => {
    expect(isJpegDataUrl("data:image/jpeg;base64," + "A".repeat(MAX_PHOTO_CHARS))).toBe(false);
    expect(isJpegDataUrl("data:image/jpeg;base64," + "A".repeat(MAX_PHOTO_CHARS - 30))).toBe(true);
  });
});

describe("photoFor", () => {
  it("gives the photo only when the version asks for it and the photo is a safe jpeg", () => expect(photoFor(true, OK)).toBe(OK));
  it("gives nothing when the version does not ask for the photo", () => {
    expect(photoFor(false, OK)).toBeNull();
    expect(photoFor(undefined, OK)).toBeNull();
    expect(photoFor("true", OK)).toBeNull();
  });
  it("gives nothing when the photo is missing or unsafe", () => {
    expect(photoFor(true, null)).toBeNull();
    expect(photoFor(true, "javascript:alert(1)")).toBeNull();
  });
});
