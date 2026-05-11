import type { DomLayoutItem, FigmaDomMatch, FigmaLayoutItem, StyleMismatch } from "./types";

function parseRgbFromCss(color: string): { r: number; g: number; b: number; a: number } | null {
  const t = color.trim();
  if (!t || t === "transparent") return null;

  const mRgba = t.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (mRgba) {
    return {
      r: Number(mRgba[1]),
      g: Number(mRgba[2]),
      b: Number(mRgba[3]),
      a: mRgba[4] !== undefined ? Number(mRgba[4]) : 1,
    };
  }

  return null;
}

function parseFigmaRgba(s: string): { r: number; g: number; b: number; a: number } | null {
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  };
}

function colorDistance(
  a: { r: number; g: number; b: number; a: number },
  b: { r: number; g: number; b: number; a: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const da = (a.a - b.a) * 255;
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}

const COLOR_DIST_THRESHOLD = 42;

/**
 * Compare Figma solid fill (when present) to computed text color for matched TEXT-heavy nodes.
 */
export function collectStyleMismatches(
  figmaById: Map<string, FigmaLayoutItem>,
  domByPath: Map<string, DomLayoutItem>,
  matches: FigmaDomMatch[],
): StyleMismatch[] {
  const out: StyleMismatch[] = [];

  for (const m of matches) {
    const fig = figmaById.get(m.figmaId);
    const dom = domByPath.get(m.domPath);
    if (!fig || !dom) continue;

    if (fig.type !== "TEXT" || !fig.text || !fig.text.trim()) continue;
    const figFill = fig.fillColorRgba ? parseFigmaRgba(fig.fillColorRgba) : null;
    const domRgb = parseRgbFromCss(dom.color);
    if (figFill && domRgb && colorDistance(figFill, domRgb) > COLOR_DIST_THRESHOLD) {
      out.push({
        figmaId: fig.id,
        domPath: dom.path,
        figmaColor: fig.fillColorRgba,
        domColor: dom.color,
        channel: "text",
      });
    }
  }

  return out;
}
