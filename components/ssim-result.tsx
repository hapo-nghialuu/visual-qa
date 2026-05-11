import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SsimResultProps = {
  score: number;
  classification: "Excellent" | "Good" | "Fair" | "Poor";
  diffMapUrl: string;
  dimensions: { width: number; height: number };
  fallback: boolean;
};

const colorByClassification = {
  Excellent: "bg-emerald-600 text-white",
  Good: "bg-blue-600 text-white",
  Fair: "bg-amber-500 text-white",
  Poor: "bg-red-600 text-white",
};

export function SsimResult({
  score,
  classification,
  diffMapUrl,
  dimensions,
  fallback,
}: SsimResultProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          SSIM: {score.toFixed(3)}
          <Badge className={colorByClassification[classification]}>{classification}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative h-56 overflow-hidden rounded border">
          <Image src={diffMapUrl} alt="Diff map" fill className="object-contain" />
        </div>
        <p className="text-sm text-muted-foreground">
          {dimensions.width}x{dimensions.height} • Method: {fallback ? "Pixel diff fallback" : "SSIM"}
        </p>
      </CardContent>
    </Card>
  );
}
