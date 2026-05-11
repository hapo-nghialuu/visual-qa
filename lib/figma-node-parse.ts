/**
 * Resolve Figma file key + node id from a design URL or manual fields.
 */

export type FigmaFileNodeRef = {
  fileKey: string;
  nodeId: string;
};

/** Path after hostname, e.g. /design/AbC123/... */
const FILE_KEY_PATH =
  /^\/(?:file|design|proto|community\/file)\/([0-9a-zA-Z]+)(?:\/|$)/i;

export function normalizeFigmaNodeId(raw: string): string {
  const t = raw.trim();
  if (!t) {
    throw new Error("Node ID is required");
  }
  const decoded = decodeURIComponent(t);
  if (decoded.includes(":")) {
    return decoded;
  }
  return decoded.replace(/-/g, ":");
}

export function parseFigmaDesignUrl(urlString: string): FigmaFileNodeRef {
  const trimmed = urlString.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new Error("Invalid Figma URL");
  }

  const host = u.hostname.toLowerCase();
  if (host !== "www.figma.com" && host !== "figma.com") {
    throw new Error("URL must be a figma.com link");
  }

  const m = u.pathname.match(FILE_KEY_PATH);
  if (!m?.[1]) {
    throw new Error("Could not read file key from URL (use a /file/… or /design/… link)");
  }

  const nodeParam = u.searchParams.get("node-id");
  if (!nodeParam) {
    throw new Error("Missing node-id in URL. Select a frame or layer in Figma, then use Copy link.");
  }

  return {
    fileKey: m[1],
    nodeId: normalizeFigmaNodeId(nodeParam),
  };
}

export function resolveFigmaFileNode(input: {
  figmaUrl?: string;
  fileKey?: string;
  nodeId?: string;
}): FigmaFileNodeRef {
  const url = typeof input.figmaUrl === "string" ? input.figmaUrl.trim() : "";
  if (url) {
    return parseFigmaDesignUrl(url);
  }

  const fk = typeof input.fileKey === "string" ? input.fileKey.trim() : "";
  const nid = typeof input.nodeId === "string" ? input.nodeId.trim() : "";
  if (!fk || !nid) {
    throw new Error("Provide a Figma URL with node-id, or both file key and node ID");
  }
  return { fileKey: fk, nodeId: normalizeFigmaNodeId(nid) };
}
