import { describe, expect, it } from "vitest";
import { findingToRedmineDescription, findingToRedmineSubject } from "@/lib/redmine-finding-text";
import type { LlmFinding } from "@/lib/llm-analyze";

const base: LlmFinding = {
  area: "Header",
  issue: "Logo lệch 2px so với Figma.",
  severity: "warning",
  suggestion: "Căn lại theo grid 8px.",
};

describe("findingToRedmineSubject", () => {
  it("prefixes index and uses task when present", () => {
    const f: LlmFinding = { ...base, task: "Căn chỉnh logo" };
    expect(findingToRedmineSubject(f, 1, 3)).toMatch(/^\[So sánh giao diện 1\/3\]/);
    expect(findingToRedmineSubject(f, 1, 3)).toContain("Căn chỉnh logo");
  });

  it("falls back to issue when task absent", () => {
    expect(findingToRedmineSubject(base, 2, 5)).toContain(base.issue);
  });

  it("truncates to 255 characters", () => {
    const long = "x".repeat(400);
    const f: LlmFinding = { ...base, task: long };
    const s = findingToRedmineSubject(f, 1, 1);
    expect(s.length).toBeLessThanOrEqual(255);
    expect(s.endsWith("…")).toBe(true);
  });
});

describe("findingToRedmineDescription", () => {
  it("includes severity and area", () => {
    const text = findingToRedmineDescription(base, 1, 2);
    expect(text).toContain("Cảnh báo");
    expect(text).toContain("Header");
    expect(text).toContain(base.suggestion);
  });

  it("includes Chi tiết when task set", () => {
    const f: LlmFinding = { ...base, task: "Title" };
    const text = findingToRedmineDescription(f, 1, 1);
    expect(text).toContain("Chi tiết:");
    expect(text).toContain(base.issue);
  });
});
