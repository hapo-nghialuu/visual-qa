import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LlmAnalysis } from "@/components/llm-analysis";
import { parseStoredLlmFindings } from "@/lib/llm-report-format";

type LogItem = {
  id: string;
  originalImage: string;
  capturedImage: string;
  diffImage: string | null;
  llmReport: string | null;
};

type LogDetailProps = {
  log: LogItem | null;
  onClose: () => void;
};

export function LogDetail({ log, onClose }: LogDetailProps) {
  const storedFindings = log?.llmReport ? parseStoredLlmFindings(log.llmReport) : [];

  return (
    <Dialog open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-6xl sm:max-w-[min(72rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Chi tiết so sánh</DialogTitle>
        </DialogHeader>
        {log ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[log.originalImage, log.capturedImage, log.diffImage ?? log.originalImage].map(
                (src, index) => (
                  <div key={index} className="relative h-52 overflow-hidden rounded border">
                    <Image src={src} alt={`Ảnh log ${index + 1}`} fill className="object-contain" />
                  </div>
                ),
              )}
            </div>
            {log.llmReport ? (
              <div className="max-h-[28rem] overflow-y-auto rounded-md border bg-card p-4">
                {storedFindings.length > 0 ? (
                  <LlmAnalysis embedded findings={storedFindings} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{log.llmReport}</p>
                )}
              </div>
            ) : null}
            <a
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              href={`/?original=${encodeURIComponent(log.originalImage)}&captured=${encodeURIComponent(log.capturedImage)}`}
            >
              So sánh lại
            </a>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
