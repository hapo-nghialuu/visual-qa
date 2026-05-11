import { describe, expect, it } from "vitest";
import { normalizeFigmaNodeId, parseFigmaDesignUrl, resolveFigmaFileNode } from "./figma-node-parse";

describe("normalizeFigmaNodeId", () => {
  it("keeps colon form", () => {
    expect(normalizeFigmaNodeId("12:345")).toBe("12:345");
  });

  it("maps hyphen form to colon", () => {
    expect(normalizeFigmaNodeId("12-345")).toBe("12:345");
  });
});

describe("parseFigmaDesignUrl", () => {
  it("parses design URL with node-id", () => {
    const r = parseFigmaDesignUrl(
      "https://www.figma.com/design/AbCdEfGh123/My-File?node-id=1-2",
    );
    expect(r.fileKey).toBe("AbCdEfGh123");
    expect(r.nodeId).toBe("1:2");
  });

  it("parses encoded node-id", () => {
    const r = parseFigmaDesignUrl("https://www.figma.com/file/XYZ/proto?node-id=3%3A4");
    expect(r.fileKey).toBe("XYZ");
    expect(r.nodeId).toBe("3:4");
  });

  it("rejects non-figma host", () => {
    expect(() =>
      parseFigmaDesignUrl("https://evil.com/file/KEY/x?node-id=1-2"),
    ).toThrow("figma.com");
  });

  it("rejects URL without node-id", () => {
    expect(() => parseFigmaDesignUrl("https://www.figma.com/design/ABC123/Title")).toThrow("node-id");
  });
});

describe("resolveFigmaFileNode", () => {
  it("prefers URL over manual fields", () => {
    const r = resolveFigmaFileNode({
      figmaUrl: "https://www.figma.com/design/AAA/Title?node-id=0-1",
      fileKey: "IGNORE",
      nodeId: "9:9",
    });
    expect(r.fileKey).toBe("AAA");
    expect(r.nodeId).toBe("0:1");
  });

  it("uses manual file key and node id", () => {
    const r = resolveFigmaFileNode({ fileKey: "myKey", nodeId: "10-20" });
    expect(r.fileKey).toBe("myKey");
    expect(r.nodeId).toBe("10:20");
  });
});
