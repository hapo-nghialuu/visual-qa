"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type RedmineProjectOption = {
  id: number;
  name: string;
  identifier: string;
};

type Props = {
  /** Prefix for stable input / list ids (e.g. `settings` or `dialog-3`). */
  idPrefix: string;
  /** Cho phép gọi API (đã có REDMINE_URL + KEY trong .env). */
  connectionConfigured: boolean;
  /** project_id hiện tại (chuỗi số). */
  projectId: string;
  onProjectIdChange: (id: string) => void;
  className?: string;
};

export function RedmineProjectNameLookup({
  idPrefix,
  connectionConfigured,
  projectId,
  onProjectIdChange,
  className,
}: Props) {
  const [nameQuery, setNameQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RedmineProjectOption[]>([]);

  async function search() {
    if (!connectionConfigured) {
      toast.error("Cần REDMINE_URL và REDMINE_API_KEY trong .env");
      return;
    }
    const q = nameQuery.trim();
    if (q.length < 1) {
      toast.error("Nhập tên hoặc identifier project");
      return;
    }

    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(
        `/api/redmine/projects?q=${encodeURIComponent(q)}`,
      );
      const data = (await res.json()) as {
        error?: string;
        projects?: RedmineProjectOption[];
        scanned?: number;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Không tải được danh sách project");
        return;
      }
      const list = data.projects ?? [];
      setResults(list);
      if (list.length === 0) {
        toast.message("Không có project khớp", {
          description:
            typeof data.scanned === "number"
              ? `Đã quét ${data.scanned} project. Thử từ khác ngắn hơn.`
              : undefined,
        });
      }
    } catch {
      toast.error("Lỗi mạng khi gọi API");
    } finally {
      setLoading(false);
    }
  }

  const inputId = `${idPrefix}-project-name-q`;
  const listId = `${idPrefix}-project-name-results`;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId}>Tên project (tìm theo Redmine)</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id={inputId}
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder="Ví dụ: Visual QA hoặc identifier"
          disabled={!connectionConfigured}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          disabled={!connectionConfigured || loading}
          onClick={() => void search()}
        >
          {loading ? "Đang tìm…" : "Tìm project"}
        </Button>
      </div>
      {projectId.trim() ? (
        <p className="text-xs text-muted-foreground">
          Mã project đang chọn: <span className="font-mono text-foreground">{projectId}</span>
        </p>
      ) : null}

      {results.length > 0 ? (
        <div
          id={listId}
          className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/20"
          role="listbox"
          aria-label="Kết quả tìm project"
        >
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/60"
              onClick={() => {
                onProjectIdChange(String(p.id));
                setResults([]);
                setNameQuery(p.name);
              }}
            >
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.identifier} — id #{p.id}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
