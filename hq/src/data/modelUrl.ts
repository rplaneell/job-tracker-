/** Where a 3D model lives. The office is served under /hq/ inside the dashboard, and from / when run on its own. */
export function modelUrl(file: string, base: string = import.meta.env.BASE_URL): string {
  return `${base.endsWith('/') ? base : `${base}/`}models/${file}`;
}
