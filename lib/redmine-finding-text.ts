import type { LlmFinding } from "@/lib/llm-analyze";
import { SEVERITY_LABEL_VI } from "@/lib/llm-report-format";

const REDMINE_SUBJECT_MAX = 255;

/** Single-line subject for Redmine (max 255 chars). */
export function findingToRedmineSubject(
  finding: LlmFinding,
  index: number,
  total: number,
): string {
  const taskTitle = finding.task?.trim() ?? "";
  const headline = taskTitle.length > 0 ? taskTitle : finding.issue;
  const prefix = `[So sánh giao diện ${index}/${total}] `;
  const body = `${headline}`.trim();
  const raw = `${prefix}${body}`.trim();
  if (raw.length <= REDMINE_SUBJECT_MAX) return raw;
  const budget = Math.max(0, REDMINE_SUBJECT_MAX - prefix.length - 1);
  return `${prefix}${body.slice(0, budget)}…`;
}

/** Plain-text description (Redmine Textile optional; plain is fine). */
export function findingToRedmineDescription(
  finding: LlmFinding,
  index: number,
  total: number,
): string {
  const taskTitle = finding.task?.trim() ?? "";
  const headline = taskTitle.length > 0 ? taskTitle : finding.issue;
  const lines: string[] = [
    `Điểm khác biệt ${index} / ${total}`,
    "",
    `Mức độ: ${SEVERITY_LABEL_VI[finding.severity]}`,
    `Tiêu đề: ${headline}`,
    "",
  ];
  if (taskTitle.length > 0) {
    lines.push("Chi tiết:", finding.issue, "");
  }
  lines.push("Khu vực giao diện:", finding.area, "", "Đề xuất xử lý:", finding.suggestion);
  return lines.join("\n").trimEnd();
}
