import { describe, expect, it } from "vitest";
import { compareDomResultToReviewFindings } from "./to-review-findings";
import type { CompareDomResult } from "./types";

const baseResult = (): CompareDomResult => ({
  steps: [],
  designCanvas: { x: 0, y: 0, w: 100, h: 100 },
  viewport: { width: 1280, height: 800 },
  figmaItemCount: 1,
  domItemCount: 1,
  matches: [],
  unmatchedFigmaIds: [],
  styleMismatches: [],
  pixelDiff: {
    width: 1280,
    height: 800,
    diffPixels: 100,
    totalPixels: 1280 * 800,
    diffRatio: 100 / (1280 * 800),
  },
  layoutFlags: [],
  artifacts: {
    figmaPngUrl: "/uploads/a.png",
    capturedPngUrl: "/uploads/b.png",
    domJsonUrl: "/uploads/d.json",
    figmaLayoutJsonUrl: "/uploads/f.json",
    debugPngUrl: "/uploads/x.png",
    diffPngUrl: "/uploads/y.png",
  },
  summaryForAi: "",
});

describe("compareDomResultToReviewFindings", () => {
  it("always includes one pixel summary row", () => {
    const rows = compareDomResultToReviewFindings(baseResult());
    expect(rows.some((r) => r.area === "Pixel")).toBe(true);
  });

  it("maps layout flags and style mismatches to separate rows", () => {
    const r = baseResult();
    r.layoutFlags = ["Low match rate"];
    r.styleMismatches = [
      {
        figmaId: "1:2",
        domPath: "body>h1",
        figmaColor: "rgba(0,0,0,1)",
        domColor: "rgb(99, 99, 99)",
        channel: "text",
      },
    ];
    const rows = compareDomResultToReviewFindings(r);
    expect(rows.filter((x) => x.area === "Layout / DOM")).toHaveLength(1);
    expect(rows.filter((x) => x.area === "Màu chữ (TEXT)")).toHaveLength(1);
    expect(rows.filter((x) => x.area === "Pixel")).toHaveLength(1);
  });
});
