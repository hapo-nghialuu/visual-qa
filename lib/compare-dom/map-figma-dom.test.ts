import { describe, expect, it } from "vitest";
import { mapFigmaToDom } from "./map-figma-dom";
import type { DomLayoutItem, FigmaLayoutItem } from "./types";

describe("mapFigmaToDom", () => {
  it("matches headline text by content and rough position", () => {
    const canvas = { x: 0, y: 0, w: 400, h: 300 };
    const figma: FigmaLayoutItem[] = [
      {
        id: "1:2",
        name: "Title",
        type: "TEXT",
        x: 20,
        y: 40,
        w: 360,
        h: 36,
        text: "Welcome aboard",
        path: "Frame/Title",
      },
    ];
    const dom: DomLayoutItem[] = [
      {
        tag: "p",
        id: "",
        className: "muted",
        text: "Footer note",
        x: 20,
        y: 600,
        w: 200,
        h: 20,
        color: "rgb(100, 100, 100)",
        backgroundColor: "rgba(0, 0, 0, 0)",
        fontSize: "14px",
        path: "body>footer>p",
      },
      {
        tag: "h1",
        id: "hero-title",
        className: "hero",
        text: "Welcome aboard",
        x: 24,
        y: 52,
        w: 340,
        h: 40,
        color: "rgb(10, 10, 10)",
        backgroundColor: "rgba(0, 0, 0, 0)",
        fontSize: "32px",
        path: "body>main>h1#hero-title",
      },
    ];
    const { matches, unmatchedFigmaIds } = mapFigmaToDom(figma, dom, canvas);
    expect(unmatchedFigmaIds).toHaveLength(0);
    expect(matches).toHaveLength(1);
    expect(matches[0].domPath).toContain("h1");
  });
});
