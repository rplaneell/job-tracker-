/** The CV photo is a small JPEG kept in the owner only master CV row. Same limit as the database check. */
export const MAX_PHOTO_CHARS = 150_000;

const JPEG_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

/** Only a plain JPEG data address passes: no svg, no script, no quotes or markup, and not over the size limit. */
export function isJpegDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_PHOTO_CHARS && JPEG_DATA_URL.test(value);
}

/**
 * The photo to print on a draft, or null. The version must ask for it (the tailoring tool sets that only for roles in
 * Barcelona) and the stored photo must be a safe JPEG.
 */
export function photoFor(withPhoto: unknown, photo: unknown): string | null {
  return withPhoto === true && isJpegDataUrl(photo) ? photo : null;
}
