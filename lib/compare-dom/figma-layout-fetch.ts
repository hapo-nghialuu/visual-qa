import type { FigmaLayoutItem } from "./types";

type FigmaColor = { r: number; g: number; b: number; a?: number };

type FigmaFill = {
  type?: string;
  visible?: boolean;
  color?: FigmaColor;
};

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  characters?: string;
  fills?: FigmaFill[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  children?: FigmaNode[];
};

function solidFillToRgba(fills: FigmaFill[] | undefined): string | undefined {
  if (!Array.isArray(fills)) return undefined;
  for (const f of fills) {
    if (f.visible === false) continue;
    if (f.type !== "SOLID" || !f.color) continue;
    const { r, g, b, a = 1 } = f.color;
    const R = Math.round(r * 255);
    const G = Math.round(g * 255);
    const B = Math.round(b * 255);
    const A = typeof a === "number" ? a : 1;
    return `rgba(${R},${G},${B},${A})`;
  }
  return undefined;
}

const MAX_NODES = 450;
const MAX_DEPTH = 14;

function walk(
  node: FigmaNode,
  parentPath: string,
  depth: number,
  out: FigmaLayoutItem[],
): void {
  if (out.length >= MAX_NODES || depth > MAX_DEPTH) return;

  const path = parentPath ? `${parentPath}/${node.name}` : node.name;
  const bb = node.absoluteBoundingBox;

  if (bb && bb.width > 0 && bb.height > 0) {
    const text = typeof node.characters === "string" ? node.characters.trim() : undefined;
    out.push({
      id: node.id,
      name: node.name,
      type: node.type,
      x: bb.x,
      y: bb.y,
      w: bb.width,
      h: bb.height,
      ...(text && text.length > 0 ? { text } : {}),
      fillColorRgba: solidFillToRgba(node.fills),
      path,
    });
  }

  if (!node.children?.length) return;
  for (const ch of node.children) {
    walk(ch, path, depth + 1, out);
  }
}

function designBounds(items: FigmaLayoutItem[]): { x: number; y: number; w: number; h: number } {
  if (items.length === 0) return { x: 0, y: 0, w: 1, h: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const it of items) {
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.w);
    maxY = Math.max(maxY, it.y + it.h);
  }
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

export type FigmaLayoutFetchResult = {
  items: FigmaLayoutItem[];
  designCanvas: { x: number; y: number; w: number; h: number };
};

export async function fetchFigmaLayoutForNode(params: {
  fileKey: string;
  nodeId: string;
  token: string;
}): Promise<FigmaLayoutFetchResult> {
  const url = new URL(
    `https://api.figma.com/v1/files/${encodeURIComponent(params.fileKey)}/nodes`,
  );
  url.searchParams.set("ids", params.nodeId);

  const res = await fetch(url.toString(), {
    headers: { "X-Figma-Token": params.token },
    signal: AbortSignal.timeout(45_000),
  });

  const json = (await res.json()) as {
    err?: string;
    nodes?: Record<string, { document?: FigmaNode }>;
  };

  if (!res.ok) {
    throw new Error(json.err ?? `Figma nodes API error (${res.status})`);
  }
  if (json.err) {
    throw new Error(json.err);
  }

  const entry = json.nodes?.[params.nodeId];
  const doc = entry?.document;
  if (!doc) {
    throw new Error("Figma nodes response missing document for this node id.");
  }

  const items: FigmaLayoutItem[] = [];
  walk(doc, "", 0, items);
  const designCanvas = designBounds(items);
  return { items, designCanvas };
}
