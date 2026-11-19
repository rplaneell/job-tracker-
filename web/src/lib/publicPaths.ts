/** What a signed out visitor may load: the login page, its callback, the tab icon and the logo files. Everything else needs a session. */
const EXACT = ["/login", "/auth/callback", "/icon.png"];
const FOLDERS = ["/brand/"];

export function isPublicPath(pathname: string): boolean {
  return EXACT.includes(pathname) || FOLDERS.some((folder) => pathname.startsWith(folder));
}
