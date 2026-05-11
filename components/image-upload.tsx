"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImageUploadProps = {
  label: string;
  value?: string;
  onChange: (url?: string) => void;
  /** When true, show a second tab to capture a full-page PNG from a URL (Playwright, server-side). */
  allowUrlCapture?: boolean;
  /** When true, only Page URL capture (no file upload). For implementation screenshot from the web. */
  urlOnly?: boolean;
};

type Meta = {
  name: string;
  size: number;
  width: number;
  height: number;
};

export function ImageUpload({
  label,
  value,
  onChange,
  allowUrlCapture = true,
  urlOnly = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"upload" | "url">(urlOnly ? "url" : "upload");
  const [pageUrl, setPageUrl] = useState("");
  const [basicAuthUsername, setBasicAuthUsername] = useState("");
  const [basicAuthPassword, setBasicAuthPassword] = useState("");
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (urlOnly) {
      setMode("url");
    }
  }, [urlOnly]);

  useEffect(() => {
    if (!value) {
      setMeta(null);
      setPageUrl("");
      setBasicAuthUsername("");
      setBasicAuthPassword("");
      setProgress(0);
    }
  }, [value]);

  async function handleFile(file: File) {
    setError("");
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      setError("Only PNG/JPG/WebP files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = localUrl;
    });
    setMeta({ name: file.name, size: file.size, ...dimensions });

    const formData = new FormData();
    formData.append("file", file);
    setProgress(30);
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    setProgress(100);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Upload failed");
      return;
    }
    const data = (await response.json()) as { url: string };
    onChange(data.url);
  }

  async function handleUrlCapture() {
    setError("");
    const trimmed = pageUrl.trim();
    if (!trimmed) {
      setError("Enter a page URL.");
      return;
    }
    setCapturing(true);
    try {
      const response = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          basicAuthUsername: basicAuthUsername.trim(),
          basicAuthPassword: basicAuthPassword,
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Screenshot failed");
        return;
      }
      onChange(data.url);
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = data.url!;
      });
      let host = trimmed;
      try {
        host = new URL(trimmed).hostname;
      } catch {
        // keep raw
      }
      setMeta({ name: host, size: 0, ...dimensions });
      setBasicAuthPassword("");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>{label}</CardTitle>
        {allowUrlCapture && !urlOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "upload" ? "default" : "outline"}
              onClick={() => {
                setMode("upload");
                setError("");
              }}
            >
              Upload file
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "url" ? "default" : "outline"}
              onClick={() => {
                setMode("url");
                setError("");
              }}
            >
              Page URL
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!urlOnly && (mode === "upload" || !allowUrlCapture) ? (
          <>
            <div
              className="cursor-pointer rounded-md border border-dashed border-border p-6 text-center"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) void handleFile(file);
              }}
            >
              <p className="text-sm text-muted-foreground">Drop image here or click to upload</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            {progress > 0 && progress < 100 ? (
              <progress className="h-2 w-full overflow-hidden rounded" max={100} value={progress} />
            ) : null}
          </>
        ) : urlOnly || (allowUrlCapture && mode === "url") ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`page-url-${label}`}>Page URL (https)</Label>
              <Input
                id={`page-url-${label}`}
                type="url"
                inputMode="url"
                placeholder="https://example.com/page"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                disabled={capturing}
              />
            </div>
            <div className="space-y-2 rounded-md border border-border/80 bg-muted/20 p-3">
              <p className="text-xs font-medium text-foreground">HTTP Basic auth (optional)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`basic-user-${label}`} className="text-xs">
                    Username
                  </Label>
                  <Input
                    id={`basic-user-${label}`}
                    type="text"
                    autoComplete="off"
                    placeholder="staging user"
                    value={basicAuthUsername}
                    onChange={(e) => setBasicAuthUsername(e.target.value)}
                    disabled={capturing}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`basic-pass-${label}`} className="text-xs">
                    Password
                  </Label>
                  <Input
                    id={`basic-pass-${label}`}
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={basicAuthPassword}
                    onChange={(e) => setBasicAuthPassword(e.target.value)}
                    disabled={capturing}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Opens the page in a headless browser, scrolls to load lazy content, disables CSS
              animations, waits for fonts and images, then saves a full-page PNG. Basic auth is
              only used for this request; the password field is cleared after a successful capture.
            </p>
            <Button type="button" disabled={capturing} onClick={() => void handleUrlCapture()}>
              {capturing ? "Capturing…" : "Capture screenshot"}
            </Button>
          </div>
        ) : null}
        {value ? (
          <div className="space-y-2">
            <div className="relative h-48 w-full overflow-hidden rounded-md border">
              <Image src={value} alt={label} fill className="object-contain" />
            </div>
            {meta ? (
              <p className="text-xs text-muted-foreground">
                {meta.name}
                {meta.size > 0 ? ` • ${(meta.size / 1024).toFixed(1)}KB` : " • full-page capture"}
                {meta.width > 0 ? ` • ${meta.width}x${meta.height}` : null}
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
