import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fetchFigmaRenderedPngBuffer } from "@/lib/figma-node-png";
import { resolveFigmaFileNode } from "@/lib/figma-node-parse";
import { parseScreenshotTargetUrl } from "@/lib/screenshot-url-policy";
import { captureWebScreenshotAndDom } from "./capture-web-dom";
import { buildCompareDomDebugPng } from "./debug-composite";
import { fetchFigmaLayoutForNode } from "./figma-layout-fetch";
import { detectLayoutBugFlags } from "./layout-bugs";
import { mapFigmaToDom } from "./map-figma-dom";
import { pixelDiffFigmaVsWebViewport } from "./pixel-diff";
import { collectStyleMismatches } from "./style-diff";
import type { CompareDomResult, DomLayoutItem } from "./types";

const MAX_BASIC_FIELD = 512;

export type RunCompareDomInput = {
  figmaUrl?: string;
  fileKey?: string;
  nodeId?: string;
  webUrl: string;
  basicAuthUsername?: string;
  basicAuthPassword?: string;
  figmaToken: string;
};

function firstDomByPath(dom: DomLayoutItem[]): Map<string, DomLayoutItem> {
  const m = new Map<string, DomLayoutItem>();
  for (const d of dom) {
    if (!m.has(d.path)) m.set(d.path, d);
  }
  return m;
}

function buildSummaryForAi(r: Omit<CompareDomResult, "artifacts">): string {
  const lines = [
    "Context: Compare DOM pipeline (Figma layout + DOM snapshot + heuristics + viewport pixelmatch).",
    `Design canvas: ${r.designCanvas.w}x${r.designCanvas.h} (Figma node bounds).`,
    `Viewport: ${r.viewport.width}x${r.viewport.height}.`,
    `Figma nodes (flattened): ${r.figmaItemCount}, DOM candidates: ${r.domItemCount}.`,
    `Greedy matches: ${r.matches.length}, unmatched Figma ids: ${r.unmatchedFigmaIds.length}.`,
    `Viewport pixel diff: ${r.pixelDiff.diffPixels}/${r.pixelDiff.totalPixels} (${Math.round(r.pixelDiff.diffRatio * 100)}%).`,
    `Style mismatches (TEXT fill vs computed color): ${r.styleMismatches.length}.`,
    "Layout flags:",
    ...r.layoutFlags.map((f) => `- ${f}`),
    "Top matches (figma path → DOM path, score):",
    ...r.matches.slice(0, 12).map((m) => `- ${m.figmaPath} → ${m.domPath} (${m.score})`),
  ];
  return lines.join("\n");
}

export async function runCompareDom(input: RunCompareDomInput): Promise<CompareDomResult> {
  const steps: CompareDomResult["steps"] = [];

  const ref = resolveFigmaFileNode({
    figmaUrl: input.figmaUrl,
    fileKey: input.fileKey,
    nodeId: input.nodeId,
  });

  let targetHref: string;
  try {
    targetHref = parseScreenshotTargetUrl(input.webUrl).href;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid web URL");
  }

  const basicUser =
    typeof input.basicAuthUsername === "string" ? input.basicAuthUsername.trim() : "";
  const basicPass =
    typeof input.basicAuthPassword === "string" ? input.basicAuthPassword : "";
  if (basicUser.length > MAX_BASIC_FIELD || basicPass.length > MAX_BASIC_FIELD) {
    throw new Error(`Basic auth fields must be at most ${MAX_BASIC_FIELD} characters`);
  }
  const httpCredentials =
    basicUser.length > 0 || basicPass.length > 0
      ? { username: basicUser, password: basicPass }
      : undefined;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const id = randomUUID();

  const figmaPngPath = path.join(uploadDir, `compare-dom-figma-${id}.png`);
  const webPngPath = path.join(uploadDir, `compare-dom-web-${id}.png`);
  const domJsonPath = path.join(uploadDir, `compare-dom-dom-${id}.json`);
  const figmaLayoutJsonPath = path.join(uploadDir, `compare-dom-figma-layout-${id}.json`);
  const diffPngPath = path.join(uploadDir, `compare-dom-diff-${id}.png`);
  const debugPngPath = path.join(uploadDir, `compare-dom-debug-${id}.png`);

  let figmaBuf: Buffer;
  try {
    figmaBuf = await fetchFigmaRenderedPngBuffer({
      fileKey: ref.fileKey,
      nodeId: ref.nodeId,
      token: input.figmaToken,
    });
    await fs.writeFile(figmaPngPath, figmaBuf);
    steps.push({ name: "Figma PNG export", ok: true });
  } catch (error) {
    steps.push({
      name: "Figma PNG export",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  let layout: Awaited<ReturnType<typeof fetchFigmaLayoutForNode>>;
  try {
    layout = await fetchFigmaLayoutForNode({
      fileKey: ref.fileKey,
      nodeId: ref.nodeId,
      token: input.figmaToken,
    });
    await fs.writeFile(figmaLayoutJsonPath, JSON.stringify(layout, null, 2), "utf8");
    steps.push({ name: "Figma layout (nodes API)", ok: true });
  } catch (error) {
    steps.push({
      name: "Figma layout (nodes API)",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  let domCapture: Awaited<ReturnType<typeof captureWebScreenshotAndDom>>;
  try {
    domCapture = await captureWebScreenshotAndDom(
      targetHref,
      webPngPath,
      httpCredentials ? { httpCredentials } : undefined,
    );
    await fs.writeFile(domJsonPath, JSON.stringify(domCapture, null, 2), "utf8");
    steps.push({ name: "Playwright capture + DOM extract", ok: true });
  } catch (error) {
    steps.push({
      name: "Playwright capture + DOM extract",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const mapping = mapFigmaToDom(layout.items, domCapture.elements, layout.designCanvas);
  steps.push({
    name: "Figma↔DOM mapping (text/position/size/hierarchy)",
    ok: true,
    detail: `${mapping.matches.length} matches`,
  });

  const figmaById = new Map(layout.items.map((f) => [f.id, f]));
  const domByPath = firstDomByPath(domCapture.elements);
  const styleMismatches = collectStyleMismatches(figmaById, domByPath, mapping.matches);
  steps.push({
    name: "Style diff (TEXT color)",
    ok: true,
    detail: `${styleMismatches.length} mismatches`,
  });

  const webBuf = await fs.readFile(webPngPath);
  let pixel: Awaited<ReturnType<typeof pixelDiffFigmaVsWebViewport>>;
  try {
    pixel = await pixelDiffFigmaVsWebViewport(figmaBuf, webBuf);
    await fs.writeFile(diffPngPath, pixel.diffPng);
    steps.push({
      name: "Pixel diff (pixelmatch, viewport top)",
      ok: true,
      detail: `${Math.round(pixel.diffRatio * 100)}%`,
    });
  } catch (error) {
    steps.push({
      name: "Pixel diff (pixelmatch, viewport top)",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const debugPng = await buildCompareDomDebugPng({
    figmaPng: figmaBuf,
    webFullPagePng: webBuf,
    diffPng: pixel.diffPng,
  });
  await fs.writeFile(debugPngPath, debugPng);
  steps.push({ name: "Debug composite PNG", ok: true });

  const layoutFlags = detectLayoutBugFlags({
    mapping,
    figmaItems: layout.items,
    pixel,
    styleMismatches,
  });
  steps.push({
    name: "Layout heuristics",
    ok: true,
    detail: `${layoutFlags.length} flags`,
  });

  const base = `/uploads/`;
  const result: CompareDomResult = {
    steps,
    designCanvas: layout.designCanvas,
    viewport: domCapture.viewport,
    figmaItemCount: layout.items.length,
    domItemCount: domCapture.elements.length,
    matches: mapping.matches,
    unmatchedFigmaIds: mapping.unmatchedFigmaIds,
    styleMismatches,
    pixelDiff: {
      width: pixel.width,
      height: pixel.height,
      diffPixels: pixel.diffPixels,
      totalPixels: pixel.totalPixels,
      diffRatio: pixel.diffRatio,
    },
    layoutFlags,
    artifacts: {
      figmaPngUrl: `${base}compare-dom-figma-${id}.png`,
      capturedPngUrl: `${base}compare-dom-web-${id}.png`,
      domJsonUrl: `${base}compare-dom-dom-${id}.json`,
      figmaLayoutJsonUrl: `${base}compare-dom-figma-layout-${id}.json`,
      debugPngUrl: `${base}compare-dom-debug-${id}.png`,
      diffPngUrl: `${base}compare-dom-diff-${id}.png`,
    },
    summaryForAi: "",
  };

  result.summaryForAi = buildSummaryForAi(result);
  return result;
}
