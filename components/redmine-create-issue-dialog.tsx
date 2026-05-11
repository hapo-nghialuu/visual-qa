"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { LlmFinding } from "@/lib/llm-analyze";
import { findingToRedmineDescription, findingToRedmineSubject } from "@/lib/redmine-finding-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedmineProjectNameLookup } from "@/components/redmine-project-name-lookup";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RedmineConfigResponse = {
  configured: boolean;
  defaults: {
    projectId: number | null;
    trackerId: number | null;
    priorityId: number | null;
  };
};

type Props = {
  finding: LlmFinding;
  /** 1-based */
  findingIndex: number;
  findingTotal: number;
  /** Khi false: không mở form tạo issue (chưa tick Review). */
  canCreateIssue?: boolean;
};

export function RedmineCreateIssueDialog({
  finding,
  findingIndex,
  findingTotal,
  canCreateIssue = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<RedmineConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [projectId, setProjectId] = useState("");
  const [trackerId, setTrackerId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const resetFormFromFinding = useCallback(() => {
    setSubject(findingToRedmineSubject(finding, findingIndex, findingTotal));
    setDescription(findingToRedmineDescription(finding, findingIndex, findingTotal));
  }, [finding, findingIndex, findingTotal]);

  useEffect(() => {
    if (!canCreateIssue && open) setOpen(false);
  }, [canCreateIssue, open]);

  useEffect(() => {
    if (!open) return;
    resetFormFromFinding();
    setProjectId("");
    setTrackerId("");
    setPriorityId("");
    void fetch("/api/redmine/config")
      .then((r) => r.json())
      .then((data: RedmineConfigResponse) => {
        setConfig(data);
        if (data.defaults.projectId != null) {
          setProjectId(String(data.defaults.projectId));
        }
        if (data.defaults.trackerId != null) {
          setTrackerId(String(data.defaults.trackerId));
        }
        if (data.defaults.priorityId != null) {
          setPriorityId(String(data.defaults.priorityId));
        }
      })
      .catch(() => {
        setConfig({ configured: false, defaults: { projectId: null, trackerId: null, priorityId: null } });
        toast.error("Không tải được cấu hình Redmine");
      })
      .finally(() => setLoadingConfig(false));
  }, [open, resetFormFromFinding]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pid = Number.parseInt(projectId, 10);
    const tid = Number.parseInt(trackerId, 10);
    if (!Number.isFinite(pid) || pid < 1) {
      toast.error("Mã project không hợp lệ");
      return;
    }
    if (!Number.isFinite(tid) || tid < 1) {
      toast.error("Mã tracker không hợp lệ");
      return;
    }
    if (!subject.trim()) {
      toast.error("Tiêu đề không được để trống");
      return;
    }

    const body: Record<string, unknown> = {
      project_id: pid,
      tracker_id: tid,
      subject: subject.trim(),
      description: description.trim(),
    };
    const pr = priorityId.trim();
    if (pr.length > 0) {
      const p = Number.parseInt(pr, 10);
      if (Number.isFinite(p) && p > 0) body.priority_id = p;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/redmine/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; issueUrl?: string; issue?: { id: number } };
      if (!res.ok) {
        toast.error(data.error ?? "Không tạo được issue");
        return;
      }
      if (data.issueUrl) {
        toast.success(`Đã tạo issue số ${data.issue?.id ?? ""}`, {
          description: data.issueUrl,
          action: {
            label: "Mở trang issue",
            onClick: () => window.open(data.issueUrl, "_blank", "noopener,noreferrer"),
          },
        });
      } else {
        toast.success("Đã tạo issue thành công");
      }
      setOpen(false);
    } catch {
      toast.error("Lỗi mạng khi gửi yêu cầu");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!canCreateIssue}
        title={canCreateIssue ? undefined : "Tick cột Review cho mục này để tạo issue"}
        onClick={() => {
          if (!canCreateIssue) return;
          setLoadingConfig(true);
          setOpen(true);
        }}
      >
        Tạo issue Redmine
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setLoadingConfig(false);
        }}
      >
        <DialogContent className="max-w-lg sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Tạo issue trên Redmine</DialogTitle>
            <DialogDescription>
              Tạo issue qua{" "}
              <a
                href="https://www.redmine.org/projects/redmine/wiki/Rest_Issues#Creating-an-issue"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                API Rest (tạo issue)
              </a>
              . <code className="rounded bg-muted px-1">REDMINE_URL</code> và{" "}
              <code className="rounded bg-muted px-1">REDMINE_API_KEY</code> chỉ cấu hình trong{" "}
              <code className="rounded bg-muted px-1">.env</code>. Mã project / tracker / mức ưu tiên mặc định:{" "}
              <Link href="/settings#redmine" className="underline underline-offset-2">
                Cài đặt → Redmine
              </Link>{" "}
              hoặc biến <code className="rounded bg-muted px-1">REDMINE_DEFAULT_*</code> trong .env.
            </DialogDescription>
          </DialogHeader>

          {loadingConfig ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : config && !config.configured ? (
            <p className="text-sm text-muted-foreground">
              Thiếu <code className="rounded bg-muted px-1">REDMINE_URL</code> hoặc{" "}
              <code className="rounded bg-muted px-1">REDMINE_API_KEY</code> trong{" "}
              <code className="rounded bg-muted px-1">.env</code> — thêm rồi khởi động lại máy chủ. Giá trị mặc định
              (tuỳ chọn) có thể đặt trong{" "}
              <Link href="/settings#redmine" className="font-medium text-foreground underline underline-offset-2">
                Cài đặt → Redmine
              </Link>{" "}
              hoặc <code className="rounded bg-muted px-1">REDMINE_DEFAULT_*</code>.
            </p>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
              <RedmineProjectNameLookup
                idPrefix={`rm-finding-${findingIndex}`}
                connectionConfigured={!!config?.configured}
                projectId={projectId}
                onProjectIdChange={setProjectId}
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`rm-project-${findingIndex}`}>Mã project *</Label>
                  <Input
                    id={`rm-project-${findingIndex}`}
                    inputMode="numeric"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="Ví dụ: 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`rm-tracker-${findingIndex}`}>Mã tracker *</Label>
                  <Input
                    id={`rm-tracker-${findingIndex}`}
                    inputMode="numeric"
                    required
                    value={trackerId}
                    onChange={(e) => setTrackerId(e.target.value)}
                    placeholder="Ví dụ: tracker Bug"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`rm-priority-${findingIndex}`}>Mã mức ưu tiên (tuỳ chọn)</Label>
                <Input
                  id={`rm-priority-${findingIndex}`}
                  inputMode="numeric"
                  value={priorityId}
                  onChange={(e) => setPriorityId(e.target.value)}
                  placeholder="Để trống — dùng mặc định của Redmine"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`rm-subject-${findingIndex}`}>Tiêu đề *</Label>
                <Input
                  id={`rm-subject-${findingIndex}`}
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`rm-desc-${findingIndex}`}>Mô tả</Label>
                <textarea
                  id={`rm-desc-${findingIndex}`}
                  rows={10}
                  className={cn(
                    "min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors",
                    "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
                    "dark:bg-input/30",
                  )}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting || !config?.configured}>
                  {submitting ? "Đang gửi…" : "Tạo issue trên Redmine"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
