import { describe, expect, it } from "vitest";
import {
  formatFindingsAsPlainText,
  formatOrderedFindingsSubsetAsPlainText,
  parseStoredLlmFindings,
} from "./llm-report-format";
import type { LlmFinding } from "./llm-analyze";

describe("formatFindingsAsPlainText", () => {
  it("formats numbered plain-text report", () => {
    const items: LlmFinding[] = [
      {
        task: "Spacing",
        area: "hero",
        issue: "Padding differs by 8px",
        severity: "warning",
        suggestion: "Match Figma 24px",
      },
    ];
    const text = formatFindingsAsPlainText(items);
    expect(text).toContain("BÁO CÁO PHÂN TÍCH GIAO DIỆN (AI)");
    expect(text).toContain("Điểm khác 1 / 1");
    expect(text).toContain("[Cảnh báo]");
    expect(text).toContain("Spacing");
    expect(text).toContain("Chi tiết:");
    expect(text).toContain("Khu vực:");
    expect(text).toContain("hero");
    expect(text).toContain("Đề xuất:");
  });

  it("formats subset by row indices", () => {
    const items: LlmFinding[] = [
      { area: "a", issue: "one", severity: "info", suggestion: "s1" },
      { area: "b", issue: "two", severity: "warning", suggestion: "s2" },
    ];
    const text = formatOrderedFindingsSubsetAsPlainText(items, new Set([1]));
    expect(text).toContain("two");
    expect(text).not.toContain("one");
  });

  it("formats item without task using bullets only for area and suggestion", () => {
    const items: LlmFinding[] = [
      { area: "footer", issue: "Wrong color", severity: "info", suggestion: "Use token gray-900" },
    ];
    const text = formatFindingsAsPlainText(items);
    expect(text).toContain("Wrong color");
    expect(text).not.toContain("Chi tiết:");
    expect(text).toContain("Khu vực:");
    expect(text).toContain("footer");
  });
});

describe("parseStoredLlmFindings", () => {
  it("parses JSON array from DB", () => {
    const raw = JSON.stringify([
      { area: "x", issue: "y", severity: "info", suggestion: "z" },
    ]);
    expect(parseStoredLlmFindings(raw)).toHaveLength(1);
  });

  it("returns empty on invalid JSON", () => {
    expect(parseStoredLlmFindings("{")).toEqual([]);
  });
});
