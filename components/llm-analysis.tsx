"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LlmFinding } from "@/lib/llm-analyze";
import {
  formatOrderedFindingsSubsetAsPlainText,
  SEVERITY_LABEL_VI,
} from "@/lib/llm-report-format";
import { Button } from "@/components/ui/button";
import { RedmineCreateIssueDialog } from "@/components/redmine-create-issue-dialog";
import { cn } from "@/lib/utils";

type LlmAnalysisProps = {
  findings: LlmFinding[];
  loading?: boolean;
  /** When true, no outer Card (e.g. inside a dialog). */
  embedded?: boolean;
  /** With `embedded`: hide inner title row (parent already has a heading). */
  embeddedNoHeading?: boolean;
};

const severityClass = {
  critical: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-600 text-white",
};

const severityOrder: Record<LlmFinding["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function sortFindings(list: LlmFinding[]): LlmFinding[] {
  return [...list]
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => {
      const d = severityOrder[a.finding.severity] - severityOrder[b.finding.severity];
      return d !== 0 ? d : a.index - b.index;
    })
    .map(({ finding }) => finding);
}

const LLM_TEXT_CLASS =
  "whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-sans tab-size-4";

function FindingsReportTable({
  ordered,
  emptyMessage,
  onReviewedChange,
  findingsSignature,
}: {
  ordered: LlmFinding[];
  emptyMessage: string;
  onReviewedChange: (s: Set<number>) => void;
  /** Đổi khi danh sách findings thay đổi — reset tick Review (tránh phụ thuộc ref `ordered`). */
  findingsSignature: string;
}) {
  const [reviewed, setReviewed] = useState<Set<number>>(() => new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const total = ordered.length;

  useEffect(() => {
    setReviewed(new Set());
  }, [findingsSignature]);

  useEffect(() => {
    onReviewedChange(new Set(reviewed));
  }, [reviewed, onReviewedChange]);

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el) return;
    el.indeterminate = reviewed.size > 0 && reviewed.size < ordered.length;
  }, [reviewed, ordered.length]);

  const allSelected = useMemo(
    () => ordered.length > 0 && reviewed.size === ordered.length,
    [ordered.length, reviewed.size],
  );

  const checkboxClass = cn(
    "size-4 shrink-0 cursor-pointer rounded border-2 border-foreground/40 bg-background align-middle",
    "shadow-sm accent-primary",
    "focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
    "dark:border-foreground/50",
  );

  function toggleRow(index: number) {
    setReviewed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setReviewed(new Set());
    } else {
      setReviewed(new Set(ordered.map((_, i) => i)));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Mỗi dòng là một hạng mục cần xem xét. Tick cột{" "}
        <span className="font-medium text-foreground">Review</span> cho các mục cần xử lý; chỉ những dòng đã tick
        mới được phép <span className="font-medium text-foreground">Tạo issue Redmine</span>.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm md:min-w-[72rem]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-16 px-2 py-3 text-center font-medium text-muted-foreground">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide">Review</span>
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={ordered.length === 0}
                  className={cn(checkboxClass, "mx-auto block")}
                  aria-label="Chọn tất cả review"
                />
              </th>
              <th className="w-10 px-2 py-3 font-medium text-muted-foreground">#</th>
              <th className="min-w-[7rem] px-2 py-3 font-medium text-muted-foreground">Mức độ</th>
              <th className="min-w-[12rem] px-2 py-3 font-medium text-muted-foreground">Tiêu đề</th>
              <th className="min-w-[8rem] px-2 py-3 font-medium text-muted-foreground">Khu vực</th>
              <th className="min-w-[14rem] px-2 py-3 font-medium text-muted-foreground">Chi tiết lỗi</th>
              <th className="min-w-[14rem] px-2 py-3 font-medium text-muted-foreground">Đề xuất xử lý</th>
              <th className="w-44 px-2 py-3 text-right font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {ordered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {ordered.map((item, index) => {
              const taskTitle = item.task?.trim() ?? "";
              const hasTask = taskTitle.length > 0;
              const headline = hasTask ? taskTitle : item.issue;
              const n = index + 1;
              const isReviewed = reviewed.has(index);

              return (
                <tr
                  key={`row-${index}-${item.area}-${item.severity}`}
                  className="border-b border-border/80 align-top odd:bg-muted/5"
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isReviewed}
                      onChange={() => toggleRow(index)}
                      className={checkboxClass}
                      aria-label={`Review mục ${n}`}
                    />
                  </td>
                  <td className="px-2 py-3 font-mono text-muted-foreground">{n}</td>
                  <td className="px-2 py-3">
                    <Badge className={severityClass[item.severity]}>
                      {SEVERITY_LABEL_VI[item.severity]}
                    </Badge>
                  </td>
                  <td className="px-2 py-3">
                    <p className={`line-clamp-3 font-medium text-foreground ${LLM_TEXT_CLASS}`}>{headline}</p>
                  </td>
                  <td className="px-2 py-3">
                    <p className={`line-clamp-2 text-muted-foreground ${LLM_TEXT_CLASS}`}>{item.area}</p>
                  </td>
                  <td className="max-w-[22rem] px-2 py-3 align-top">
                    <p className={`max-h-40 overflow-y-auto text-foreground ${LLM_TEXT_CLASS}`}>{item.issue}</p>
                  </td>
                  <td className="max-w-[22rem] px-2 py-3 align-top">
                    <p className={`max-h-40 overflow-y-auto text-muted-foreground ${LLM_TEXT_CLASS}`}>
                      {item.suggestion}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <RedmineCreateIssueDialog
                      finding={item}
                      findingIndex={n}
                      findingTotal={total}
                      canCreateIssue={isReviewed}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LlmAnalysis({
  findings,
  loading,
  embedded = false,
  embeddedNoHeading = false,
}: LlmAnalysisProps) {
  const ordered = useMemo(() => sortFindings(findings), [findings]);
  const findingsSignature = useMemo(
    () =>
      `${findings.length}:${findings.map((f) => `${f.severity}\x1f${f.issue.slice(0, 120)}`).join("\x1e")}`,
    [findings],
  );
  const emptyMessage = embedded
    ? "Không có báo cáo phân tích cho log này."
    : "Chưa có mục nào trong báo cáo. Chạy phân tích sâu (AI) trước.";

  const [reviewedForCopy, setReviewedForCopy] = useState<Set<number>>(new Set());
  const syncReviewedForCopy = useCallback((s: Set<number>) => {
    setReviewedForCopy(s);
  }, []);

  useEffect(() => {
    setReviewedForCopy(new Set());
  }, [findings]);

  if (loading && findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đang phân tích AI…</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Khoảng 5–10 giây.</p>
        </CardContent>
      </Card>
    );
  }

  const copyHandler = () => {
    void navigator.clipboard.writeText(
      formatOrderedFindingsSubsetAsPlainText(ordered, reviewedForCopy),
    );
  };

  const copyButton =
    ordered.length > 0 ? (
      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <p className="max-w-xs text-right text-[11px] text-muted-foreground">
          Sao chép: {reviewedForCopy.size > 0 ? "chỉ các dòng đã tick Review" : "toàn bộ bảng"} — tick Review trước
          nếu cần lọc.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={copyHandler}>
          Sao chép báo cáo
        </Button>
      </div>
    ) : null;

  if (embedded) {
    const loadingHint =
      loading && findings.length > 0 ? (
        <p className="text-xs text-muted-foreground">Đang cập nhật phân tích AI — các dòng hiện có giữ nguyên.</p>
      ) : null;

    if (embeddedNoHeading) {
      return (
        <div className="space-y-4">
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-between">
            {loadingHint}
            {copyButton}
          </div>
          <FindingsReportTable
            ordered={ordered}
            emptyMessage={emptyMessage}
            onReviewedChange={syncReviewedForCopy}
            findingsSignature={findingsSignature}
          />
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="flex flex-row flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Báo cáo review (mỗi dòng một lỗi)</h3>
          {copyButton}
        </div>
        {loadingHint}
        <FindingsReportTable
          ordered={ordered}
          emptyMessage={emptyMessage}
          onReviewedChange={syncReviewedForCopy}
          findingsSignature={findingsSignature}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <CardTitle>Báo cáo review (mỗi dòng một lỗi)</CardTitle>
        {copyButton}
      </CardHeader>
      {loading && findings.length > 0 ? (
        <p className="px-4 pb-0 text-xs text-muted-foreground md:px-6">
          Đang cập nhật phân tích AI — các dòng hiện có giữ nguyên.
        </p>
      ) : null}
      <CardContent className="px-4 pb-8 pt-2 md:px-6 md:pb-10">
        <FindingsReportTable
          ordered={ordered}
          emptyMessage={emptyMessage}
          onReviewedChange={syncReviewedForCopy}
          findingsSignature={findingsSignature}
        />
      </CardContent>
    </Card>
  );
}
