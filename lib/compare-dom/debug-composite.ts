import sharp from "sharp";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./capture-web-dom";

/**
 * Horizontal strip: Figma (resized) | Web viewport crop | Pixel diff (red on transparent).
 */
export async function buildCompareDomDebugPng(params: {
  figmaPng: Buffer;
  webFullPagePng: Buffer;
  diffPng: Buffer;
}): Promise<Buffer> {
  const w = VIEWPORT_WIDTH;
  const h = VIEWPORT_HEIGHT;

  const figma = await sharp(params.figmaPng)
    .resize(w, h, { fit: "fill" })
    .png()
    .toBuffer();

  const meta = await sharp(params.webFullPagePng).metadata();
  const srcW = meta.width ?? w;
  const srcH = meta.height ?? h;
  const cropW = Math.min(w, srcW);
  const cropH = Math.min(h, srcH);

  const web = await sharp(params.webFullPagePng)
    .extract({ left: 0, top: 0, width: cropW, height: cropH })
    .resize(w, h, { fit: "fill" })
    .png()
    .toBuffer();

  const diff = await sharp(params.diffPng).png().toBuffer();

  const totalW = w * 3;
  return sharp({
    create: {
      width: totalW,
      height: h,
      channels: 3,
      background: { r: 26, g: 26, b: 28 },
    },
  })
    .composite([
      { input: figma, left: 0, top: 0 },
      { input: web, left: w, top: 0 },
      { input: diff, left: w * 2, top: 0 },
    ])
    .png()
    .toBuffer();
}
