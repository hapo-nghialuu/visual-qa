import type { CompareDomResult } from "./types";
import type { LlmFinding } from "@/lib/llm-analyze";

export function compareDomResultToReviewFindings(result: CompareDomResult): LlmFinding[] {
  const out: LlmFinding[] = [];

  for (const flag of result.layoutFlags) {
    out.push({
      task: "Heuristic layout",
      area: "Layout / DOM",
      issue: flag,
      severity: "warning",
      suggestion: "Kiểm tra mapping Figma↔DOM, copy TEXT và cấu trúc khối trên implementation.",
    });
  }

  for (const sm of result.styleMismatches) {
    out.push({
      task: sm.domPath.slice(0, 80) || sm.figmaId,
      area: "Màu chữ (TEXT)",
      issue: `Figma ${sm.figmaColor ?? "(không đọc được fill)"} vs DOM ${sm.domColor} (node ${sm.figmaId}).`,
      severity: "warning",
      suggestion: "Khớp màu fill TEXT trên Figma với computed color trên web (theme / CSS variables).",
    });
  }

  const pct = Math.round(result.pixelDiff.diffRatio * 100);
  const pixelSeverity: LlmFinding["severity"] =
    result.pixelDiff.diffRatio > 0.22 ? "critical" : result.pixelDiff.diffRatio > 0.12 ? "warning" : "info";

  out.push({
    task: "Chênh lệch pixel (viewport đầu trang)",
    area: "Pixel",
    issue: `${result.pixelDiff.diffPixels.toLocaleString()} / ${result.pixelDiff.totalPixels.toLocaleString()} pixel khác nhau (${pct}%), khung ${result.pixelDiff.width}×${result.pixelDiff.height}.`,
    severity: pixelSeverity,
    suggestion:
      "Đối chiếu ảnh debug 3 cột; kiểm tra font, line-height, ảnh raster và spacing so với export Figma.",
  });

  return out;
}
