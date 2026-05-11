import type { FigmaLayoutItem } from "./types";
import type { MapFigmaDomResult } from "./map-figma-dom";
import type { StyleMismatch } from "./types";
import type { PixelDiffResult } from "./pixel-diff";

export function detectLayoutBugFlags(input: {
  mapping: MapFigmaDomResult;
  figmaItems: FigmaLayoutItem[];
  pixel: PixelDiffResult;
  styleMismatches: StyleMismatch[];
}): string[] {
  const flags: string[] = [];

  const textNodes = input.figmaItems.filter((f) => f.type === "TEXT" && f.text && f.text.trim().length > 0);
  const unmatchedText = textNodes.filter((f) => input.mapping.unmatchedFigmaIds.includes(f.id));
  if (unmatchedText.length > 0) {
    flags.push(
      `${unmatchedText.length} Figma TEXT layer(s) had no confident DOM match (check copy or structure).`,
    );
  }

  if (input.mapping.unmatchedFigmaIds.length > input.figmaItems.length * 0.35) {
    flags.push("Low overall Figma↔DOM match rate — layout or scale may differ from the exported node.");
  }

  if (input.pixel.diffRatio > 0.22) {
    flags.push(
      `Viewport pixel drift is high (${Math.round(input.pixel.diffRatio * 100)}% of pixels differ) — spacing, fonts, or assets may be off.`,
    );
  } else if (input.pixel.diffRatio > 0.12) {
    flags.push(
      `Moderate viewport pixel drift (${Math.round(input.pixel.diffRatio * 100)}%) — review typography and spacing.`,
    );
  }

  if (input.styleMismatches.length > 0) {
    flags.push(`${input.styleMismatches.length} matched element(s) show notable color differences vs Figma fills.`);
  }

  return flags;
}
