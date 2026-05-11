import type { DomLayoutItem, FigmaDomMatch, FigmaLayoutItem } from "./types";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./capture-web-dom";

const W_TEXT = 0.45;
const W_POS = 0.3;
const W_SIZE = 0.15;
const W_HIER = 0.1;

const MIN_SCORE = 0.12;

function normText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function textSimilarity(fig: FigmaLayoutItem, dom: DomLayoutItem): number {
  const ft = fig.text ? normText(fig.text) : "";
  const fn = normText(fig.name);
  const dt = normText(dom.text);
  const tag = dom.tag.toLowerCase();

  if (ft.length >= 3 && dt.includes(ft)) return 1;
  if (ft.length >= 3) {
    const words = ft.split(" ").filter((w) => w.length > 3);
    if (words.some((w) => dt.includes(w))) return 0.85;
  }
  if (fn.length >= 3 && dt.includes(fn)) return 0.75;
  if (fn.length >= 3 && tag === "img" && dom.id && normText(dom.id).includes(fn)) return 0.4;
  if (ft.length > 0 && dt.length > 0) {
    const a = new Set(ft.split(" "));
    const b = new Set(dt.split(" "));
    let inter = 0;
    for (const w of a) {
      if (w.length < 2) continue;
      if (b.has(w)) inter++;
    }
    const union = a.size + b.size || 1;
    return Math.min(1, (2 * inter) / union);
  }
  if (fn.length > 0 && dt.includes(fn.slice(0, Math.min(fn.length, 12)))) return 0.55;
  return 0;
}

function figmaCenterNorm(fig: FigmaLayoutItem, canvas: { x: number; y: number; w: number; h: number }) {
  const cx = fig.x + fig.w / 2;
  const cy = fig.y + fig.h / 2;
  return {
    nx: (cx - canvas.x) / canvas.w,
    ny: (cy - canvas.y) / canvas.h,
  };
}

function domCenterNorm(dom: DomLayoutItem) {
  const cx = dom.x + dom.w / 2;
  const cy = dom.y + dom.h / 2;
  return {
    nx: cx / VIEWPORT_WIDTH,
    ny: cy / Math.max(VIEWPORT_HEIGHT * 2, 1),
  };
}

function positionSimilarity(
  fig: FigmaLayoutItem,
  dom: DomLayoutItem,
  canvas: { x: number; y: number; w: number; h: number },
): number {
  const a = figmaCenterNorm(fig, canvas);
  const b = domCenterNorm(dom);
  const d = Math.hypot(a.nx - b.nx, a.ny - b.ny);
  return Math.max(0, 1 - d / 1.25);
}

function sizeSimilarity(
  fig: FigmaLayoutItem,
  dom: DomLayoutItem,
  canvas: { x: number; y: number; w: number; h: number },
): number {
  const frw = fig.w / canvas.w;
  const frh = fig.h / canvas.h;
  const drw = dom.w / VIEWPORT_WIDTH;
  const drh = dom.h / VIEWPORT_HEIGHT;
  const rw = Math.min(frw, drw) / Math.max(frw, drw, 1e-6);
  const rh = Math.min(frh, drh) / Math.max(frh, drh, 1e-6);
  return Math.min(1, (rw + rh) / 2);
}

function tokenizePath(p: string): Set<string> {
  const raw = p.replace(/>/g, "/").split(/[/\s]+/);
  const s = new Set<string>();
  for (const t of raw) {
    const x = normText(t).replace(/[^a-z0-9#.-]/g, "");
    if (x.length >= 2) s.add(x);
  }
  return s;
}

function hierarchySimilarity(fig: FigmaLayoutItem, dom: DomLayoutItem): number {
  const a = tokenizePath(fig.path);
  const b = tokenizePath(dom.path);
  if (a.size === 0 || b.size === 0) return 0.3;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter++;
    else {
      for (const u of b) {
        if (u.includes(t) || t.includes(u)) {
          inter += 0.5;
          break;
        }
      }
    }
  }
  return Math.min(1, inter / Math.sqrt(a.size * b.size));
}

export function scorePair(
  fig: FigmaLayoutItem,
  dom: DomLayoutItem,
  canvas: { x: number; y: number; w: number; h: number },
): { score: number; breakdown: FigmaDomMatch["breakdown"] } {
  const text = textSimilarity(fig, dom);
  const position = positionSimilarity(fig, dom, canvas);
  const size = sizeSimilarity(fig, dom, canvas);
  const hierarchy = hierarchySimilarity(fig, dom);
  const score =
    W_TEXT * text + W_POS * position + W_SIZE * size + W_HIER * hierarchy;
  return { score, breakdown: { text, position, size, hierarchy } };
}

export type MapFigmaDomResult = {
  matches: FigmaDomMatch[];
  unmatchedFigmaIds: string[];
};

export function mapFigmaToDom(
  figmaItems: FigmaLayoutItem[],
  domItems: DomLayoutItem[],
  designCanvas: { x: number; y: number; w: number; h: number },
): MapFigmaDomResult {
  const usedDom = new Set<number>();
  const matches: FigmaDomMatch[] = [];

  const orderedFigma = [...figmaItems].sort((a, b) => {
    const at = a.text ? a.text.length : 0;
    const bt = b.text ? b.text.length : 0;
    return bt - at;
  });

  for (const fig of orderedFigma) {
    let bestI = -1;
    let bestScore = 0;
    let bestBreak: FigmaDomMatch["breakdown"] = {
      text: 0,
      position: 0,
      size: 0,
      hierarchy: 0,
    };

    domItems.forEach((dom, i) => {
      if (usedDom.has(i)) return;
      const { score, breakdown } = scorePair(fig, dom, designCanvas);
      if (score > bestScore) {
        bestScore = score;
        bestI = i;
        bestBreak = breakdown;
      }
    });

    if (bestI >= 0 && bestScore >= MIN_SCORE) {
      usedDom.add(bestI);
      matches.push({
        figmaId: fig.id,
        figmaPath: fig.path,
        domPath: domItems[bestI].path,
        score: Math.round(bestScore * 1000) / 1000,
        breakdown: bestBreak,
      });
    }
  }

  const matchedIds = new Set(matches.map((m) => m.figmaId));
  const unmatchedFigmaIds = figmaItems.filter((f) => !matchedIds.has(f.id)).map((f) => f.id);

  return { matches, unmatchedFigmaIds };
}
