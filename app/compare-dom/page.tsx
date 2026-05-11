"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { LlmAnalysis } from "@/components/llm-analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compareDomResultToReviewFindings } from "@/lib/compare-dom/to-review-findings";
import type { CompareDomResult } from "@/lib/compare-dom/types";
import type { LlmFinding } from "@/lib/llm-analyze";

export default function CompareDomPage() {
  const [figmaUrl, setFigmaUrl] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareDomResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [findings, setFindings] = useState<LlmFinding[]>([]);

  const machineReviewFindings = useMemo(
    () => (result ? compareDomResultToReviewFindings(result) : []),
    [result],
  );

  const reviewFindings = useMemo(
    () => [...machineReviewFindings, ...findings],
    [machineReviewFindings, findings],
  );

  const runCompare = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setFindings([]);
    try {
      const res = await fetch("/api/compare-dom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl: figmaUrl.trim(),
          webUrl: webUrl.trim(),
          basicAuthUsername: basicUser.trim(),
          basicAuthPassword: basicPass,
        }),
      });
      const data = (await res.json()) as CompareDomResult | { error?: string };
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? "Compare DOM failed");
        return;
      }
      setResult(data as CompareDomResult);
      toast.success("Compare DOM finished");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [figmaUrl, webUrl, basicUser, basicPass]);

  const runAi = useCallback(async () => {
    if (!result?.artifacts) return;
    setAiLoading(true);
    setFindings([]);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImage: result.artifacts.figmaPngUrl,
          capturedImage: result.artifacts.capturedPngUrl,
          extraContext: result.summaryForAi,
        }),
      });
      const data = (await res.json()) as { findings?: LlmFinding[]; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "AI analysis failed");
        return;
      }
      setFindings(data.findings ?? []);
      toast.success("AI summary ready");
    } catch {
      toast.error("Network error");
    } finally {
      setAiLoading(false);
    }
  }, [result]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare DOM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Figma layout (REST) + Playwright full-page capture + DOM metadata JSON + heuristic mapping +
          viewport pixelmatch + debug strip. Optional AI summary uses the same vision analyze API with
          extra context.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="figma-url">Figma URL (with node-id)</Label>
            <Input
              id="figma-url"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://www.figma.com/design/... ?node-id=..."
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="web-url">Implementation URL</Label>
            <Input
              id="web-url"
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
              placeholder="https://example.com/page"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ba-user">HTTP Basic user (optional)</Label>
              <Input
                id="ba-user"
                value={basicUser}
                onChange={(e) => setBasicUser(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ba-pass">HTTP Basic password (optional)</Label>
              <Input
                id="ba-pass"
                type="password"
                value={basicPass}
                onChange={(e) => setBasicPass(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <Button type="button" onClick={runCompare} disabled={loading}>
            {loading ? "Running…" : "Run Compare DOM"}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {result.steps.map((s) => (
                  <li key={s.name}>
                    <span className={s.ok ? "text-foreground" : "text-destructive"}>{s.name}</span>
                    {s.detail ? <span className="text-muted-foreground"> — {s.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Figma items: {result.figmaItemCount}, DOM nodes: {result.domItemCount}, matches:{" "}
                {result.matches.length}
              </p>
              <p>
                Pixel diff (viewport top {result.pixelDiff.width}×{result.pixelDiff.height}):{" "}
                {result.pixelDiff.diffPixels} px ({Math.round(result.pixelDiff.diffRatio * 100)}%)
              </p>
              <p>Style mismatches (TEXT): {result.styleMismatches.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debug image (Figma | Web crop | Diff)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-x-auto rounded-md border border-border bg-muted/30 p-2">
                <Image
                  src={result.artifacts.debugPngUrl}
                  alt="Compare DOM debug"
                  width={3840}
                  height={800}
                  className="h-auto max-w-none"
                  unoptimized
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <a className="text-primary underline" href={result.artifacts.domJsonUrl} target="_blank" rel="noreferrer">
                  dom.json
                </a>
                <a
                  className="text-primary underline"
                  href={result.artifacts.figmaLayoutJsonUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  figma-layout.json
                </a>
                <a className="text-primary underline" href={result.artifacts.diffPngUrl} target="_blank" rel="noreferrer">
                  diff.png
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto rounded-md border border-border text-xs font-mono">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="p-2">Score</th>
                      <th className="p-2">Figma</th>
                      <th className="p-2">DOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matches.slice(0, 40).map((m) => (
                      <tr key={`${m.figmaId}-${m.domPath}`} className="border-b border-border/60">
                        <td className="p-2 align-top">{m.score}</td>
                        <td className="p-2 align-top break-all">{m.figmaPath}</td>
                        <td className="p-2 align-top break-all">{m.domPath}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bảng review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mỗi dòng là một hạng mục (heuristic + pixel; thêm hàng từ AI sau khi chạy phân tích).
              </p>
              <Button type="button" variant="secondary" onClick={runAi} disabled={aiLoading}>
                {aiLoading ? "Analyzing…" : "Run vision analyze with DOM context"}
              </Button>
              <LlmAnalysis
                findings={reviewFindings}
                loading={aiLoading}
                embedded
                embeddedNoHeading
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
