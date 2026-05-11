/** Normalize Redmine root URL (supports path, e.g. https://host/redmine). */
export function normalizeRedmineBaseUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const noTrailSlash = withScheme.replace(/\/+$/, "");
  try {
    const u = new URL(noTrailSlash);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}
