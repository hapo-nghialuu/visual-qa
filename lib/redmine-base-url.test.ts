import { describe, expect, it } from "vitest";
import { normalizeRedmineBaseUrl } from "@/lib/redmine-base-url";

describe("normalizeRedmineBaseUrl", () => {
  it("strips trailing slashes and keeps path", () => {
    expect(normalizeRedmineBaseUrl("https://x.com/redmine///")).toBe("https://x.com/redmine");
  });

  it("adds https when scheme omitted", () => {
    expect(normalizeRedmineBaseUrl("redmine.internal")).toBe("https://redmine.internal");
  });

  it("rejects empty", () => {
    expect(normalizeRedmineBaseUrl("  ")).toBeNull();
  });

  it("accepts http", () => {
    expect(normalizeRedmineBaseUrl("http://localhost/redmine")).toBe("http://localhost/redmine");
  });
});
