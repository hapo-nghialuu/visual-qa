import { describe, expect, it } from "vitest";
import { ssimResultToReviewFindings } from "./ssim-review-findings";

describe("ssimResultToReviewFindings", () => {
  it("returns one row with SSIM area", () => {
    const rows = ssimResultToReviewFindings({
      score: 0.91,
      classification: "Good",
      fallback: false,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].area).toBe("SSIM");
    expect(rows[0].severity).toBe("info");
  });

  it("uses critical severity for Poor", () => {
    const rows = ssimResultToReviewFindings({
      score: 0.5,
      classification: "Poor",
      fallback: true,
    });
    expect(rows[0].severity).toBe("critical");
    expect(rows[0].issue).toContain("so sánh cơ bản");
  });
});
