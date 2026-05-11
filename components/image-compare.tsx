"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ImageCompareProps = {
  originalImage: string;
  capturedImage: string;
  diffImage?: string;
  onAnalyze: () => void;
  canAnalyze: boolean;
  analyzeDisabled: boolean;
};

export function ImageCompare({
  originalImage,
  capturedImage,
  diffImage,
  onAnalyze,
  canAnalyze,
  analyzeDisabled,
}: ImageCompareProps) {
  const [mode, setMode] = useState<"side" | "overlay">("side");
  const [opacity, setOpacity] = useState<25 | 50 | 75>(50);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>So sánh ảnh</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant={mode === "side" ? "default" : "outline"} onClick={() => setMode("side")}>
            Side-by-Side
          </Button>
          <Button
            variant={mode === "overlay" ? "default" : "outline"}
            onClick={() => setMode("overlay")}
          >
            Overlay
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "side" ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[originalImage, capturedImage, diffImage ?? originalImage].map((src, index) => (
              <div key={index} className="relative h-56 overflow-hidden rounded border">
                <Image src={src} alt={`Compare view ${index + 1}`} fill className="object-contain" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative h-72 overflow-hidden rounded border">
              <Image src={originalImage} alt="Original" fill className="object-contain" />
              <div
                className={`absolute inset-0 ${
                  opacity === 25 ? "opacity-25" : opacity === 75 ? "opacity-75" : "opacity-50"
                }`}
              >
                <Image src={capturedImage} alt="Captured overlay" fill className="object-contain" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={opacity === 25 ? "default" : "outline"}
                onClick={() => setOpacity(25)}
              >
                25%
              </Button>
              <Button
                type="button"
                variant={opacity === 50 ? "default" : "outline"}
                onClick={() => setOpacity(50)}
              >
                50%
              </Button>
              <Button
                type="button"
                variant={opacity === 75 ? "default" : "outline"}
                onClick={() => setOpacity(75)}
              >
                75%
              </Button>
            </div>
          </div>
        )}
        {canAnalyze ? (
          <Button type="button" onClick={onAnalyze} disabled={analyzeDisabled}>
            Phân tích sâu (AI)
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
