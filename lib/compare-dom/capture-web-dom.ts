import { setTimeout as sleep } from "node:timers/promises";
import type { Browser, Page } from "playwright";
import type { DomLayoutItem } from "./types";

const DISABLE_ANIM_CSS = `*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}`;

const IMAGE_WAIT_CAP_MS = 4_000;
const MAX_SCROLL_PASSES = 5;

export const VIEWPORT_WIDTH = 1280;
export const VIEWPORT_HEIGHT = 800;

export type CaptureUrlOptions = {
  httpCredentials?: { username: string; password: string };
};

export type WebDomCaptureResult = {
  elements: DomLayoutItem[];
  viewport: { width: number; height: number };
};

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

function extractDomInPage(): WebDomCaptureResult {
  const MAX = 500;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const nodes = Array.from(document.body.querySelectorAll<HTMLElement>("body *"));
  const elements: DomLayoutItem[] = [];

  const buildPath = (el: HTMLElement): string => {
    const parts: string[] = [];
    let cur: HTMLElement | null = el;
    let depth = 0;
    while (cur && cur.tagName && depth < 8) {
      const tag = cur.tagName.toLowerCase();
      const id = cur.id ? `#${cur.id}` : "";
      parts.unshift(`${tag}${id}`);
      cur = cur.parentElement;
      depth++;
    }
    return parts.join(">");
  };

  for (const el of nodes) {
    if (elements.length >= MAX) break;
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "noscript" || tag === "svg") continue;

    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 2 || h < 2) continue;

    const sx = window.scrollX;
    const sy = window.scrollY;
    const x = rect.left + sx;
    const y = rect.top + sy;

    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;

    const rawText = (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 240);

    elements.push({
      tag,
      id: el.id || "",
      className: typeof el.className === "string" ? el.className : "",
      text: rawText,
      x,
      y,
      w,
      h,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      path: buildPath(el),
    });
  }

  return {
    elements,
    viewport: { width: vw, height: vh },
  };
}

/**
 * Same capture prep as url-page-screenshot, then DOM metadata at scroll origin, then full-page PNG.
 */
export async function captureWebScreenshotAndDom(
  targetUrl: string,
  outputPngPath: string,
  options?: CaptureUrlOptions,
): Promise<WebDomCaptureResult> {
  let browser: Browser | undefined;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      deviceScaleFactor: 1,
      ...(options?.httpCredentials ? { httpCredentials: options.httpCredentials } : {}),
    });
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.addStyleTag({ content: DISABLE_ANIM_CSS });
    await scrollLazyContentAdaptive(page);
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);
    await waitForImagesCapped(page);
    await sleep(350);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await sleep(80);
    const dom = await page.evaluate(extractDomInPage);
    await page.screenshot({ path: outputPngPath, fullPage: true, type: "png" });
    await context.close();
    return dom;
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
