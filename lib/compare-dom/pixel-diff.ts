import pixelmatch from "pixelmatch";
import sharp from "sharp";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./capture-web-dom";

export type PixelDiffResult = {
  width: number;
  height: number;
  diffPixels: number;
  totalPixels: number;
  diffRatio: number;
  diffPng: Buffer;
};

/**
 * Compare Figma export with the top-of-page viewport crop of a full-page Playwright PNG.
 */
export async function pixelDiffFigmaVsWebViewport(
  figmaPng: Buffer,
  webFullPagePng: Buffer,
): Promise<PixelDiffResult> {
  const w = VIEWPORT_WIDTH;
  const h = VIEWPORT_HEIGHT;

  const figmaRgba = await sharp(figmaPng)
    .resize(w, h, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const meta = await sharp(webFullPagePng).metadata();
  const srcW = meta.width ?? w;
  const srcH = meta.height ?? h;
  const cropW = Math.min(w, srcW);
  const cropH = Math.min(h, srcH);

  const webCropRgba = await sharp(webFullPagePng)
    .extract({ left: 0, top: 0, width: cropW, height: cropH })
    .resize(w, h, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (figmaRgba.info.width !== w || figmaRgba.info.height !== h) {
    throw new Error("Unexpected figma rgba dimensions after resize");
  }
  if (webCropRgba.info.width !== w || webCropRgba.info.height !== h) {
    throw new Error("Unexpected web crop rgba dimensions");
  }

  const a = figmaRgba.data;
  const b = webCropRgba.data;
  const diff = Buffer.alloc(w * h * 4);
  const diffPixels = pixelmatch(a, b, diff, w, h, {
    threshold: 0.12,
    includeAA: true,
    diffMask: false,
  });

  const diffPng = await sharp(diff, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();

  const totalPixels = w * h;
  return {
    width: w,
    height: h,
    diffPixels,
    totalPixels,
    diffRatio: diffPixels / totalPixels,
    diffPng,
  };
}
