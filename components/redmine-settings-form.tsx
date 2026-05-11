"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RedmineProjectNameLookup } from "@/components/redmine-project-name-lookup";

type SavedDefaults = {
  defaultProjectId: number | null;
  defaultTrackerId: number | null;
  defaultPriorityId: number | null;
};

type LoadedResponse = {
  connectionConfigured: boolean;
  settings: SavedDefaults | null;
};

function parseIdField(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function RedmineSettingsForm() {
  const [connectionConfigured, setConnectionConfigured] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState("");
  const [defaultTrackerId, setDefaultTrackerId] = useState("");
  const [defaultPriorityId, setDefaultPriorityId] = useState("");
  const [saving, setSaving] = useState(false);

  const applyRow = useCallback((s: SavedDefaults | null) => {
    if (!s) {
      setDefaultProjectId("");
      setDefaultTrackerId("");
      setDefaultPriorityId("");
      return;
    }
    setDefaultProjectId(s.defaultProjectId != null ? String(s.defaultProjectId) : "");
    setDefaultTrackerId(s.defaultTrackerId != null ? String(s.defaultTrackerId) : "");
    setDefaultPriorityId(s.defaultPriorityId != null ? String(s.defaultPriorityId) : "");
  }, []);

  const reload = useCallback(() => {
    return fetch("/api/redmine/settings")
      .then((r) => r.json())
      .then((data: LoadedResponse) => {
        setConnectionConfigured(data.connectionConfigured);
        applyRow(data.settings);
      });
  }, [applyRow]);

  useEffect(() => {
    void reload().catch(() => {
      toast.error("Không tải được cấu hình Redmine");
    });
  }, [reload]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/redmine/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProjectId: parseIdField(defaultProjectId),
          defaultTrackerId: parseIdField(defaultTrackerId),
          defaultPriorityId: parseIdField(defaultPriorityId),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Lưu thất bại");
        return;
      }
      toast.success("Đã lưu giá trị mặc định Redmine");
      await reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="redmine">
      <CardHeader>
        <CardTitle>Redmine — giá trị mặc định khi tạo issue</CardTitle>
        <p className="text-sm text-muted-foreground">
          Địa chỉ và khóa API chỉ đặt trong <code className="rounded bg-muted px-1 text-xs">.env</code> (
          <code className="rounded bg-muted px-1 text-xs">REDMINE_URL</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">REDMINE_API_KEY</code>
          ) — khởi động lại máy chủ sau khi sửa. Phần dưới lưu <strong>mã số mặc định</strong> cho nút{" "}
          <span className="text-foreground">Tạo issue Redmine</span>; ô có giá trị sẽ thay cho biến{" "}
          <code className="rounded bg-muted px-1 text-xs">REDMINE_DEFAULT_*</code> tương ứng trong .env.
        </p>
        {!connectionConfigured ? (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
            Chưa cấu hình đủ URL và API key trong .env — không gọi được API Redmine (kể cả tìm tên project).
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <RedmineProjectNameLookup
          idPrefix="redmine-settings"
          connectionConfigured={connectionConfigured}
          projectId={defaultProjectId}
          onProjectIdChange={setDefaultProjectId}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="redmine-def-project">Mã project mặc định</Label>
            <p className="text-xs text-muted-foreground">
              Biến .env: <code className="rounded bg-muted px-1">REDMINE_DEFAULT_PROJECT_ID</code>
            </p>
            <Input
              id="redmine-def-project"
              inputMode="numeric"
              value={defaultProjectId}
              onChange={(e) => setDefaultProjectId(e.target.value)}
              placeholder="Để trống — chỉ dùng .env"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="redmine-def-tracker">Mã tracker mặc định</Label>
            <p className="text-xs text-muted-foreground">
              Biến .env: <code className="rounded bg-muted px-1">REDMINE_DEFAULT_TRACKER_ID</code>
            </p>
            <Input
              id="redmine-def-tracker"
              inputMode="numeric"
              value={defaultTrackerId}
              onChange={(e) => setDefaultTrackerId(e.target.value)}
              placeholder="Ví dụ: tracker Bug"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="redmine-def-priority">Mã mức ưu tiên mặc định (tuỳ chọn)</Label>
            <p className="text-xs text-muted-foreground">
              Biến .env: <code className="rounded bg-muted px-1">REDMINE_DEFAULT_PRIORITY_ID</code>
            </p>
            <Input
              id="redmine-def-priority"
              inputMode="numeric"
              value={defaultPriorityId}
              onChange={(e) => setDefaultPriorityId(e.target.value)}
              placeholder="Tuỳ chọn"
            />
          </div>
        </div>

        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu giá trị mặc định"}
        </Button>
      </CardContent>
    </Card>
  );
}
