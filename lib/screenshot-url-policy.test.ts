import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseScreenshotTargetUrl } from "./screenshot-url-policy";

describe("parseScreenshotTargetUrl", () => {
  const snapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...snapshot, NODE_ENV: "test" };
    delete process.env.ALLOW_SCREENSHOT_INTERNAL;
  });

  afterEach(() => {
    process.env = { ...snapshot };
  });

  it("accepts https public URLs", () => {
    const r = parseScreenshotTargetUrl("https://example.com/path?q=1");
    expect(r.href).toContain("example.com");
  });

  it("rejects empty input", () => {
    expect(() => parseScreenshotTargetUrl("   ")).toThrow("required");
  });

  it("rejects non-http(s) protocols", () => {
    expect(() => parseScreenshotTargetUrl("file:///etc/passwd")).toThrow("Only http");
  });

  it("rejects URLs with embedded credentials", () => {
    expect(() => parseScreenshotTargetUrl("https://user:pass@example.com/")).toThrow("credentials");
  });

  it("blocks localhost in production without override", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_SCREENSHOT_INTERNAL;
    expect(() => parseScreenshotTargetUrl("http://localhost:3000/")).toThrow("production");
  });

  it("allows localhost in production when ALLOW_SCREENSHOT_INTERNAL=true", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_SCREENSHOT_INTERNAL = "true";
    const r = parseScreenshotTargetUrl("http://localhost:3000/");
    expect(r.href).toContain("localhost");
  });
});
