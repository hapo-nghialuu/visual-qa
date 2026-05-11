export type FigmaLayoutItem = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** TEXT node characters */
  text?: string;
  /** rgba(...) from first solid fill when available */
  fillColorRgba?: string;
  /** e.g. FRAME/SECTION/TEXT — for hierarchy hint */
  path: string;
};

export type DomLayoutItem = {
  tag: string;
  id: string;
  className: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  backgroundColor: string;
  fontSize: string;
  path: string;
};

export type FigmaDomMatch = {
  figmaId: string;
  figmaPath: string;
  domPath: string;
  score: number;
  /** 0–1 components */
  breakdown: {
    text: number;
    position: number;
    size: number;
    hierarchy: number;
  };
};

export type StyleMismatch = {
  figmaId: string;
  domPath: string;
  figmaColor?: string;
  domColor: string;
  channel: "text";
};

export type CompareDomArtifacts = {
  figmaPngUrl: string;
  capturedPngUrl: string;
  domJsonUrl: string;
  figmaLayoutJsonUrl: string;
  debugPngUrl: string;
  diffPngUrl: string;
};

export type CompareDomResult = {
  steps: { name: string; ok: boolean; detail?: string }[];
  designCanvas: { x: number; y: number; w: number; h: number };
  viewport: { width: number; height: number };
  figmaItemCount: number;
  domItemCount: number;
  matches: FigmaDomMatch[];
  unmatchedFigmaIds: string[];
  styleMismatches: StyleMismatch[];
  pixelDiff: {
    width: number;
    height: number;
    diffPixels: number;
    totalPixels: number;
    diffRatio: number;
  };
  layoutFlags: string[];
  artifacts: CompareDomArtifacts;
  /** Short plain-text for LLM extraContext */
  summaryForAi: string;
};
