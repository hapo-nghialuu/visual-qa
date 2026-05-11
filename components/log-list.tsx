"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LogDetail } from "@/components/log-detail";

type LogItem = {
  id: string;
  originalImage: string;
  capturedImage: string;
  ssimScore: number | null;
  analysisMode: string;
  createdAt: string;
  llmReport: string | null;
  diffImage: string | null;
};

type LogListProps = {
  projectId?: string;
};

export function LogList({ projectId }: LogListProps) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<LogItem | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (projectId) params.set("projectId", projectId);
    fetch(`/api/logs?${params.toString()}`)
      .then((response) => response.json())
      .then((data: { logs: LogItem[]; totalPages: number }) => {
        setLogs(data.logs ?? []);
        setTotalPages(data.totalPages ?? 1);
      });
  }, [page, projectId]);

  if (logs.length === 0) {
    return <EmptyState title="No comparisons yet" description="Run your first compare to create logs." />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {logs.map((log) => (
          <button
            key={log.id}
            className="w-full rounded-lg border p-3 text-left hover:bg-muted/30"
            onClick={() => setSelected(log)}
          >
            <div className="grid items-center gap-4 md:grid-cols-[80px_80px_1fr]">
              <div className="relative h-14 w-20 overflow-hidden rounded border">
                <Image src={log.originalImage} alt="Original" fill className="object-cover" />
              </div>
              <div className="relative h-14 w-20 overflow-hidden rounded border">
                <Image src={log.capturedImage} alt="Captured" fill className="object-cover" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{log.analysisMode}</Badge>
                <span className="text-sm">SSIM: {(log.ssimScore ?? 0).toFixed(3)}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </Button>
        <span className="text-sm">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      <LogDetail log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
