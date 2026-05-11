import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import type { LlmProvider } from "@/lib/llm-analyze";
import { getDefaultLlmPromptFromMarkdown } from "@/lib/load-default-llm-prompt";

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
  custom: "custom-model",
};

export type ResolvedLlmSettings = {
  source: "database" | "env";
  provider: LlmProvider;
  apiKey: string;
  model: string;
  endpoint: string | null;
  promptTemplate: string;
};

function parseProvider(raw: string | undefined): LlmProvider | null {
  if (raw === "anthropic" || raw === "openai" || raw === "google" || raw === "custom") {
    return raw;
  }
  return null;
}

/**
 * DB row wins. If none, optional env defaults (see .env.example) for local/dev.
 */
export async function getResolvedLlmSettings(
  userId: string,
): Promise<ResolvedLlmSettings | null> {
  const row = await db.aiSettings.findUnique({ where: { userId } });
  if (row) {
    const apiKey = decrypt(row.apiKeyEncrypted);
    if (!apiKey) return null;
    return {
      source: "database",
      provider: row.provider as LlmProvider,
      apiKey,
      model: row.model,
      endpoint: row.endpoint,
      promptTemplate: row.promptTemplate,
    };
  }

  const provider = parseProvider(process.env.LLM_DEFAULT_PROVIDER);
  const apiKey = process.env.LLM_DEFAULT_API_KEY?.trim();
  if (!provider || !apiKey) return null;

  const modelRaw = process.env.LLM_DEFAULT_MODEL?.trim();
  const model = modelRaw || DEFAULT_MODELS[provider];

  let endpoint: string | null = null;
  if (provider === "custom") {
    endpoint = process.env.LLM_DEFAULT_ENDPOINT?.trim() || null;
    if (!endpoint) return null;
  }

  const promptTemplate = await getDefaultLlmPromptFromMarkdown();

  return {
    source: "env",
    provider,
    apiKey,
    model,
    endpoint,
    promptTemplate,
  };
}
