import { setTimeout as sleep } from "node:timers/promises";
import type { Browser, Page } from "playwright";

const DISABLE_ANIM_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}`;

/** Max time to wait for in-viewport images after scroll (avoid hanging on hundreds of off-screen lazy imgs). */
const IMAGE_WAIT_CAP_MS = 4_000;

/** Stop lazy-load passes when scroll height unchanged (1-based pass index). */
const MAX_SCROLL_PASSES = 5;

export type CaptureUrlOptions = {
  /** HTTP Basic Authentication (WWW-Authenticate). Sent only to the target origin. */
  httpCredentials?: { username: string; password: string };
};

/**
 * Scroll until document height stabilizes (lazy sections) — bounded passes, faster steps than before.
 */
async function scrollLazyContentAdaptive(page: Page): Promise<void> {
  let previousHeight = 0;
  for (let pass = 0; pass < MAX_SCROLL_PASSES; pass++) {
    const height = await page.evaluate(async () => {
      const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      const scrollHeight = () =>
        Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0,
        );
      const step = 900;
      let y = 0;
      const target = scrollHeight();
      while (y < target) {
        window.scrollBy(0, step);
        y += step;
        await delay(20);
      }
      window.scrollTo(0, scrollHeight());
      await delay(100);
      window.scrollTo(0, 0);
      await delay(60);
      return scrollHeight();
    });

    if (pass > 0 && height === previousHeight) {
      break;
    }
    previousHeight = height;
    await sleep(100);
  }
}

async function waitForImagesCapped(page: Page): Promise<void> {
  await Promise.race([
    page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      );
    }),
    sleep(IMAGE_WAIT_CAP_MS),
  ]);
}

/**
 * Opens URL, prepares DOM, writes full-page PNG to disk path.
 *
 * Note: we intentionally avoid `networkidle` — on SPAs it often sits until timeout (10–20s+)
 * because of analytics, websockets, or long-polling.
 */
export async function captureUrlToPngFile(
  targetUrl: string,
  outputPath: string,
  options?: CaptureUrlOptions,
): Promise<void> {
  let browser: Browser | undefined;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      ...(options?.httpCredentials
        ? { httpCredentials: options.httpCredentials }
        : {}),
    });
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.addStyleTag({ content: DISABLE_ANIM_CSS });
    await scrollLazyContentAdaptive(page);
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);
    await waitForImagesCapped(page);
    await sleep(350);
    await page.screenshot({ path: outputPath, fullPage: true, type: "png" });
    await context.close();
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
