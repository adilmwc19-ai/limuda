/** Canonical production origin. Never derive share links from the deployment host. */
export const SITE_URL = "https://limuda.co.il";

/** Absolute production URL for a pathname (and optional search/hash). */
export function canonicalUrl(path: string = "/"): string {
  return new URL(path, SITE_URL).toString();
}
