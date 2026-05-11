"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_LLM_PROMPT_TEMPLATE } from "@/lib/llm-prompt-template";

const defaultPrompt = DEFAULT_LLM_PROMPT_TEMPLATE;

const defaultModels = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
  custom: "custom-model",
} as const;

type Provider = keyof typeof defaultModels;

export function AiSettingsForm() {
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState<string>(defaultModels.anthropic);
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [promptTemplate, setPromptTemplate] = useState(defaultPrompt);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const modelOptions = useMemo(() => {
    if (provider === "google") {
      return ["gemini-2.5-flash", "gemma-4-31b-it"];
    }
    return [defaultModels[provider]];
  }, [provider]);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings?: { provider: Provider; model: string; endpoint?: string; promptTemplate: string } | null }) => {
        if (!data.settings) return;
        setProvider(data.settings.provider);
        setModel(data.settings.model);
        setEndpoint(data.settings.endpoint ?? "");
        setPromptTemplate(data.settings.promptTemplate);
      });
  }, []);

  async function testConnection() {
    const response = await fetch("/api/settings/test", { method: "POST" });
    const data = (await response.json()) as { success: boolean; message: string };
    if (response.ok && data.success) toast.success(data.message);
    else toast.error(data.message || "Connection failed");
  }

  async function saveSettings() {
    if (!promptTemplate.includes("{IMAGE_1}") || !promptTemplate.includes("{IMAGE_2}")) {
      toast.error("Prompt must contain {IMAGE_1} and {IMAGE_2} placeholders");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          endpoint: provider === "custom" ? endpoint : null,
          promptTemplate,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || "Save failed");
        return;
      }
      toast.success("Settings saved");
      setApiKey("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Model Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={provider}
            onValueChange={(value) => {
              if (!value) return;
              const nextProvider = value as Provider;
              setProvider(nextProvider);
              setModel(defaultModels[nextProvider]);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="google">Google AI Studio</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={model}
            onValueChange={(value) => {
              if (!value) return;
              setModel(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>API Key</Label>
          <div className="flex gap-2">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
            />
            <Button type="button" variant="outline" onClick={() => setShowKey((prev) => !prev)}>
              {showKey ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        {provider === "custom" ? (
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Input
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="https://api.example.com/v1/chat/completions"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Prompt Template</Label>
          <textarea
            className="min-h-36 w-full rounded-md border border-input bg-background p-3 text-sm"
            value={promptTemplate}
            onChange={(event) => setPromptTemplate(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={testConnection}>
            Test Connection
          </Button>
          <Button type="button" onClick={saveSettings} disabled={saving}>
            Save Settings
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPromptTemplate(defaultPrompt)}>
            Reset to default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
