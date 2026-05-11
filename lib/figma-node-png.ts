/**
 * Download a rendered PNG for a Figma file node (Figma REST images API).
 */

export type FigmaNodePngParams = {
  fileKey: string;
  nodeId: string;
  token: string;
  /** "1" | "2" | "4" — Figma API scale query param */
  scale?: string;
};

export async function fetchFigmaRenderedPngBuffer(params: FigmaNodePngParams): Promise<Buffer> {
  const scale = params.scale ?? "1";
  const imagesUrl = new URL(
    `https://api.figma.com/v1/images/${encodeURIComponent(params.fileKey)}`,
  );
  imagesUrl.searchParams.set("ids", params.nodeId);
  imagesUrl.searchParams.set("format", "png");
  imagesUrl.searchParams.set("scale", scale);

  const figmaRes = await fetch(imagesUrl.toString(), {
    headers: { "X-Figma-Token": params.token },
    signal: AbortSignal.timeout(45_000),
  });

  const figmaJson = (await figmaRes.json()) as {
    err?: string;
    images?: Record<string, string | null>;
  };

  if (!figmaRes.ok) {
    throw new Error(figmaJson.err ?? `Figma API error (${figmaRes.status})`);
  }
  if (figmaJson.err) {
    throw new Error(figmaJson.err);
  }

  const imageUrl = figmaJson.images?.[params.nodeId];
  if (!imageUrl) {
    throw new Error("Figma did not return an image URL for this node.");
  }

  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!imgRes.ok) {
    throw new Error("Failed to download rendered image from Figma");
  }

  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length === 0) {
    throw new Error("Empty image from Figma");
  }
  return buf;
}
