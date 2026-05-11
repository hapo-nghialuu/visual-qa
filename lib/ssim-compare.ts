"use client";

export type SsimComparisonResult = {
  score: number;
  classification: "Excellent" | "Good" | "Fair" | "Poor";
  diffMapBlob: Blob;
  dimensions: { width: number; height: number };
  fallback: boolean;
};

type LoadedImage = {
  element: HTMLImageElement;
  width: number;
  height: number;
};

function classify(score: number): SsimComparisonResult["classification"] {
  if (score > 0.95) return "Excellent";
  if (score > 0.85) return "Good";
  if (score > 0.7) return "Fair";
  return "Poor";
}

function loadImage(src: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () =>
      resolve({ element: image, width: image.width, height: image.height });
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

function getCanvasData(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unsupported");
  }
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, ctx, imageData: ctx.getImageData(0, 0, width, height) };
}

function fallbackPixelDiff(
  img1: ImageData,
  img2: ImageData,
): { score: number; diffImageData: ImageData } {
  const diff = new Uint8ClampedArray(img1.data.length);
  let different = 0;
  const totalPixels = img1.width * img1.height;

  for (let i = 0; i < img1.data.length; i += 4) {
    const dr = Math.abs(img1.data[i] - img2.data[i]);
    const dg = Math.abs(img1.data[i + 1] - img2.data[i + 1]);
    const db = Math.abs(img1.data[i + 2] - img2.data[i + 2]);
    const distance = dr + dg + db;
    const changed = distance > 45;

    if (changed) {
      different += 1;
      diff[i] = 167;
      diff[i + 1] = 28;
      diff[i + 2] = 58;
    } else {
      diff[i] = 34;
      diff[i + 1] = 197;
      diff[i + 2] = 94;
    }
    diff[i + 3] = 255;
  }

  return {
    score: Math.max(0, 1 - different / totalPixels),
    diffImageData: new ImageData(diff, img1.width, img1.height),
  };
}

async function imageDataToBlob(data: ImageData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unsupported");
  }
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create diff blob"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function compareSSIM(
  originalUrl: string,
  capturedUrl: string,
): Promise<SsimComparisonResult> {
  const [{ element: original }, { element: captured }] = await Promise.all([
    loadImage(originalUrl),
    loadImage(capturedUrl),
  ]);
  const width = Math.min(original.width, captured.width);
  const height = Math.min(original.height, captured.height);

  const originalCanvas = getCanvasData(original, width, height);
  const capturedCanvas = getCanvasData(captured, width, height);

  try {
    const { ssim } = await import("ssim.js");
    const result = (ssim as unknown as (a: ImageData, b: ImageData) => {
      mssim: number;
      mssimMap: number[];
    })(originalCanvas.imageData, capturedCanvas.imageData);

    const diffData = new Uint8ClampedArray(width * height * 4);
    const map = result.mssimMap ?? [];
    for (let i = 0; i < map.length; i++) {
      const offset = i * 4;
      const intensity = Math.round((1 - map[i]) * 255);
      diffData[offset] = 167;
      diffData[offset + 1] = 197 - Math.min(intensity, 160);
      diffData[offset + 2] = 238 - Math.min(intensity, 200);
      diffData[offset + 3] = 255;
    }

    const diffMapBlob = await imageDataToBlob(new ImageData(diffData, width, height));
    return {
      score: result.mssim,
      classification: classify(result.mssim),
      diffMapBlob,
      dimensions: { width, height },
      fallback: false,
    };
  } catch {
    const fallbackResult = fallbackPixelDiff(
      originalCanvas.imageData,
      capturedCanvas.imageData,
    );
    const diffMapBlob = await imageDataToBlob(fallbackResult.diffImageData);
    return {
      score: fallbackResult.score,
      classification: classify(fallbackResult.score),
      diffMapBlob,
      dimensions: { width, height },
      fallback: true,
    };
  }
}
