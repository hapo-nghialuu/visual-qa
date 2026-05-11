"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FigmaOriginalSourceProps = {
  value?: string;
  onChange: (url?: string) => void;
};

type Meta = {
  fileKey: string;
  nodeId: string;
  width: number;
  height: number;
};

export function FigmaOriginalSource({ value, onChange }: FigmaOriginalSourceProps) {
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [fileKey, setFileKey] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!value) {
      setMeta(null);
      setFigmaUrl("");
      setFileKey("");
      setNodeId("");
    }
  }, [value]);

  async function handleImport() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/figma-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl: figmaUrl.trim() || undefined,
          fileKey: fileKey.trim() || undefined,
          nodeId: nodeId.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        url?: string;
        fileKey?: string;
        nodeId?: string;
        error?: string;
      };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Figma import failed");
        return;
      }
      onChange(data.url);
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = data.url!;
      });
      setMeta({
        fileKey: data.fileKey ?? (fileKey.trim() || "—"),
        nodeId: data.nodeId ?? (nodeId.trim() || "—"),
        ...dimensions,
      });
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    figmaUrl.trim().length > 0 || (fileKey.trim().length > 0 && nodeId.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Original (Figma)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Dùng Figma REST API: export PNG theo node (cần{" "}
          <a
            className="font-medium text-primary underline"
            href="https://www.figma.com/developers/api#access-tokens"
            target="_blank"
            rel="noreferrer"
          >
            FIGMA_ACCESS_TOKEN
          </a>{" "}
          trong .env).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="figma-url">Figma link (có node-id)</Label>
          <Input
            id="figma-url"
            type="url"
            inputMode="url"
            placeholder="https://www.figma.com/design/…?node-id=1-2"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            disabled={loading}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">hoặc</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="figma-file-key">File key</Label>
            <Input
              id="figma-file-key"
              type="text"
              autoComplete="off"
              placeholder="AbCdEfGh123"
              value={fileKey}
              onChange={(e) => setFileKey(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="figma-node-id">Node ID</Label>
            <Input
              id="figma-node-id"
              type="text"
              autoComplete="off"
              placeholder="1:2 hoặc 1-2"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        <Button type="button" disabled={loading || !canSubmit} onClick={() => void handleImport()}>
          {loading ? "Đang tải từ Figma…" : "Import PNG từ Figma"}
        </Button>
        {value ? (
          <div className="space-y-2 border-t pt-4">
            <div className="relative h-48 w-full overflow-hidden rounded-md border">
              <Image src={value} alt="Figma export" fill className="object-contain" />
            </div>
            {meta ? (
              <p className="text-xs text-muted-foreground">
                File {meta.fileKey} • node {meta.nodeId} • {meta.width}x{meta.height}
              </p>
            ) : null}
            <Button variant="outline" type="button" onClick={() => onChange(undefined)}>
              Remove
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
