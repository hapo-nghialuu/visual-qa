"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { compareSSIM } from "@/lib/ssim-compare";
import type { LlmFinding } from "@/lib/llm-analyze";
import { FigmaOriginalSource } from "@/components/figma-original-source";
import { ImageUpload } from "@/components/image-upload";
import { ProjectSelector } from "@/components/project-selector";
import { Button } from "@/components/ui/button";
import { SsimResult } from "@/components/ssim-result";
import { ImageCompare } from "@/components/image-compare";
import { LlmAnalysis } from "@/components/llm-analysis";
import { EmptyState } from "@/components/empty-state";
import { ssimResultToReviewFindings } from "@/lib/ssim-review-findings";

type SsimState = {
  score: number;
  classification: "Excellent" | "Good" | "Fair" | "Poor";
  diffMapUrl: string;
  dimensions: { width: number; height: number };
  fallback: boolean;
  comparisonId?: string;
};

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string>();
  const [capturedImage, setCapturedImage] = useState<string>();
  const [projectId, setProjectId] = useState<string>("");
  const [ssimResult, setSsimResult] = useState<SsimState | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [llmFindings, setLlmFindings] = useState<LlmFinding[]>([]);
  const [nextAnalyzeAt, setNextAnalyzeAt] = useState(0);
  const [settingsWarning, setSettingsWarning] = useState(false);

  const reviewFindings = useMemo(() => {
    if (!ssimResult) return [];
    return [...ssimResultToReviewFindings(ssimResult), ...llmFindings];
  }, [ssimResult, llmFindings]);

  async function saveComparison(
    payload: Omit<SsimState, "comparisonId"> & { llmReport?: string; analysisMode?: string },
  ) {
    if (!originalImage || !capturedImage || !projectId) return;
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        originalImage,
        capturedImage,
        diffImage: payload.diffMapUrl,
        ssimScore: payload.score,
        analysisMode: payload.analysisMode ?? "ssim",
        llmReport: payload.llmReport,
      }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { comparison: { id: string } };
    setSsimResult((current) => (current ? { ...current, comparisonId: data.comparison.id } : current));
  }

  async function handleCompare() {
    if (!originalImage || !capturedImage) return;
    setLlmFindings([]);
    setLoadingCompare(true);
    try {
      const result = await compareSSIM(originalImage, capturedImage);
      const diffMapUrl = URL.createObjectURL(result.diffMapBlob);
      const next = { ...result, diffMapUrl };
      setSsimResult(next);
      await saveComparison(next);
      toast.success("So sánh hoàn tất");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "So sánh thất bại");
    } finally {
      setLoadingCompare(false);
    }
  }

  async function handleDeepAnalysis() {
    if (!originalImage || !capturedImage || !ssimResult) return;
    if (Date.now() < nextAnalyzeAt) {
      toast.error("Vui lòng đợi 30 giây trước khi chạy phân tích sâu lần nữa.");
      return;
    }

    const settingsResponse = await fetch("/api/settings");
    const settingsData = (await settingsResponse.json()) as { settings: unknown };
    if (!settingsData.settings) {
      setSettingsWarning(true);
      return;
    }

    setSettingsWarning(false);
    setLoadingAnalysis(true);
    setNextAnalyzeAt(Date.now() + 30000);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImage,
          capturedImage,
          comparisonId: ssimResult.comparisonId,
        }),
      });
      const data = (await response.json()) as { findings?: LlmFinding[]; error?: string };
      if (!response.ok || !data.findings) {
        toast.error(data.error || "Phân tích thất bại");
        return;
      }
      setLlmFindings(data.findings);
      toast.success("Đã hoàn tất phân tích AI — xem báo cáo bên dưới");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col gap-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Visual Compare Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Original: PNG export từ Figma theo node. Captured: chụp full-page từ URL web (Playwright), rồi SSIM + AI.
          </p>
        </div>
        <div className="mt-4 rounded-xl border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active Project
          </p>
          <ProjectSelector value={projectId} onChange={setProjectId} />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nguồn ảnh</h2>
          <span className="text-xs text-muted-foreground">
            Trái: Figma (link + node-id hoặc file key + node). Phải: URL web → screenshot PNG.
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FigmaOriginalSource value={originalImage} onChange={setOriginalImage} />
          <ImageUpload
            label="Captured (URL web)"
            value={capturedImage}
            onChange={setCapturedImage}
            urlOnly
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleCompare}
            disabled={!originalImage || !capturedImage || !projectId || loadingCompare}
          >
            {loadingCompare ? "Đang so sánh…" : "So sánh (SSIM)"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Bước 1: SSIM (~1–2 giây) • Bước 2: Phân tích sâu AI (~5–10 giây) → báo cáo
          </span>
        </div>
      </section>

      {settingsWarning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-100 p-4 text-sm text-amber-900">
          <p className="font-medium">AI settings chưa được cấu hình</p>
          <p className="mt-1">
            Cấu hình AI trong Cài đặt để dùng phân tích sâu, hoặc đặt{" "}
            <code className="rounded bg-amber-200/80 px-1">LLM_DEFAULT_*</code> trong{" "}
            <code className="rounded bg-amber-200/80 px-1">.env</code>.{" "}
            <Link className="font-medium underline" href="/settings">
              Mở Cài đặt
            </Link>
          </p>
        </div>
      ) : null}

      {!ssimResult ? (
        <EmptyState
          title="Thêm ảnh Figma + ảnh web"
          description="Import PNG từ Figma node, chụp URL web cho Captured, rồi bấm Compare."
        />
      ) : (
        <>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <SsimResult
              score={ssimResult.score}
              classification={ssimResult.classification}
              diffMapUrl={ssimResult.diffMapUrl}
              dimensions={ssimResult.dimensions}
              fallback={ssimResult.fallback}
            />
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <ImageCompare
              originalImage={originalImage || ""}
              capturedImage={capturedImage || ""}
              diffImage={ssimResult.diffMapUrl}
              onAnalyze={handleDeepAnalysis}
              canAnalyze
              analyzeDisabled={loadingAnalysis}
            />
          </section>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <LlmAnalysis findings={reviewFindings} loading={loadingAnalysis} />
          </section>
        </>
      )}
    </div>
  );
}
