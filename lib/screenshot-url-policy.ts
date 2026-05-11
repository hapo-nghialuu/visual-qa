/**
 * Validates a user-supplied URL for server-side Playwright capture (SSRF mitigation).
 */

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost") return true;
  if (host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;
  if (host.startsWith("172.")) {
    const second = Number(host.split(".")[1] ?? "0");
    return second >= 16 && second <= 31;
  }
  if (host === "[::1]" || host === "0:0:0:0:0:0:0:1") return true;
  return false;
}

export type ParsedScreenshotUrl = {
  href: string;
  origin: string;
};

export function parseScreenshotTargetUrl(raw: string): ParsedScreenshotUrl {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("URL is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL must not include credentials");
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error("Invalid URL host");
  }

  const privateOrLocal = isPrivateHost(hostname);
  if (privateOrLocal) {
    const allow =
      process.env.ALLOW_SCREENSHOT_INTERNAL === "true" || process.env.NODE_ENV !== "production";
    if (!allow) {
      throw new Error(
        "Local or private network URLs are not allowed in production. Set ALLOW_SCREENSHOT_INTERNAL=true to enable.",
      );
    }
  }

  return { href: parsed.href, origin: parsed.origin };
}
