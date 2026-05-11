import type { LlmFinding } from "@/lib/llm-analyze";

export type SsimReviewInput = {
  score: number;
  classification: "Excellent" | "Good" | "Fair" | "Poor";
  fallback: boolean;
};

export function ssimResultToReviewFindings(state: SsimReviewInput): LlmFinding[] {
  const fb = state.fallback ? " (chế độ so sánh cơ bản do SSIM không khả dụng)" : "";
  const severity: LlmFinding["severity"] =
    state.classification === "Poor"
      ? "critical"
      : state.classification === "Fair"
        ? "warning"
        : "info";

  return [
    {
      task: "Tổng quan SSIM",
      area: "SSIM",
      issue: `Điểm SSIM ${state.score.toFixed(4)} — ${state.classification}${fb}.`,
      severity,
      suggestion:
        "Dùng heatmap SSIM và Phân tích sâu AI để liệt kê lệch theo vùng giao diện; chỉnh layout/asset nếu điểm thấp.",
    },
  ];
}
