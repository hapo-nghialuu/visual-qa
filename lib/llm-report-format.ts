import type { LlmFinding } from "@/lib/llm-analyze";

export const SEVERITY_LABEL_VI: Record<LlmFinding["severity"], string> = {
  critical: "Nghiêm trọng",
  warning: "Cảnh báo",
  info: "Thông tin",
};

/**
 * `ordered`: thứ tự đang hiển thị. `rowIndices`: chỉ số dòng (0-based) trong `ordered` cần đưa vào báo cáo.
 * Nếu `rowIndices` rỗng → toàn bộ `ordered`.
 */
export function formatOrderedFindingsSubsetAsPlainText(
  ordered: LlmFinding[],
  rowIndices: ReadonlySet<number>,
): string {
  if (rowIndices.size === 0) {
    return formatFindingsAsPlainText(ordered);
  }
  const picked = [...rowIndices]
    .sort((a, b) => a - b)
    .map((i) => ordered[i])
    .filter((x): x is LlmFinding => !!x);
  if (picked.length === 0) {
    return formatFindingsAsPlainText(ordered);
  }
  return formatFindingsAsPlainText(picked);
}

export function formatFindingsAsPlainText(items: LlmFinding[]): string {
  const total = items.length;
  const lines: string[] = ["BÁO CÁO PHÂN TÍCH GIAO DIỆN (AI)", "====================", ""];
  items.forEach((item, i) => {
    const n = i + 1;
    const title = item.task?.trim() || item.issue;
    lines.push(`── Điểm khác ${n} / ${total} ──`);
    lines.push("");
    lines.push(`[${SEVERITY_LABEL_VI[item.severity]}] ${title}`);
    lines.push("");
    if (item.task?.trim()) {
      lines.push("Chi tiết:");
      lines.push(item.issue);
      lines.push("");
    }
    lines.push("Khu vực:");
    lines.push(item.area);
    lines.push("");
    lines.push("Đề xuất:");
    lines.push(item.suggestion);
    lines.push("");
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

/** Parse `llmReport` JSON saved on Comparison rows. */
export function parseStoredLlmFindings(raw: string | null): LlmFinding[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is LlmFinding =>
        !!x &&
        typeof x === "object" &&
        typeof (x as LlmFinding).issue === "string" &&
        (x as LlmFinding).issue.length > 0,
    );
  } catch {
    return [];
  }
}
