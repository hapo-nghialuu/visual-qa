export type LlmProvider = "anthropic" | "openai" | "google" | "custom";

export type LlmFinding = {
  /** Short checklist title (optional); UI falls back to issue if empty. */
  task?: string;
  area: string;
  issue: string;
  severity: "critical" | "warning" | "info";
  suggestion: string;
};

export type AnalyzeParams = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  endpoint?: string | null;
  promptTemplate: string;
  image1Base64: string;
  image2Base64: string;
  /** Appended after the main prompt (e.g. Compare DOM summary). */
  extraContext?: string | null;
};

type AnalyzeResult = {
  text: string;
  tokensUsed?: number;
};

const DEFAULT_TIMEOUT_MS = 60000;

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

function parseJsonWithFallback(raw: string): LlmFinding[] {
  const normalize = (input: unknown): LlmFinding[] => {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const candidate = item as Record<string, unknown>;
        const severity = String(candidate.severity ?? "info").toLowerCase();
        const normalizedSeverity =
          severity === "critical" || severity === "warning" || severity === "info"
            ? severity
            : "info";

        const rawTask = [candidate.task, candidate.title, candidate.name].find(
          (v): v is string => typeof v === "string" && v.trim().length > 0,
        );
        const task = rawTask?.trim();

        return {
          ...(task ? { task } : {}),
          area: String(candidate.area ?? "General"),
          issue: String(candidate.issue ?? ""),
          severity: normalizedSeverity,
          suggestion: String(candidate.suggestion ?? ""),
        } as LlmFinding;
      })
      .filter((item): item is LlmFinding => !!item && item.issue.length > 0);
  };

  try {
    return normalize(JSON.parse(raw));
  } catch {
    const markdownJson = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    if (markdownJson) {
      try {
        return normalize(JSON.parse(markdownJson));
      } catch {
        // fall through
      }
    }

    return [
      {
        area: "Analysis",
        issue: raw.slice(0, 5000),
        severity: "info",
        suggestion: "Review raw AI output and refine prompt if needed.",
      },
    ];
  }
}

function buildPrompt(template: string, extraContext?: string | null): string {
  const base = template
    .replaceAll("{IMAGE_1}", "Image 1")
    .replaceAll("{IMAGE_2}", "Image 2");
  const extra = typeof extraContext === "string" ? extraContext.trim() : "";
  if (!extra) return base;
  return `${base}\n\n--- Structured context (DOM compare / tooling) ---\n${extra}`;
}

async function callAnthropic(params: AnalyzeParams): Promise<AnalyzeResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: withTimeout(DEFAULT_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(params.promptTemplate, params.extraContext) },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: params.image1Base64,
              },
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: params.image2Base64,
              },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Anthropic request failed");
  }

  const text = payload?.content?.[0]?.text;
  return {
    text: typeof text === "string" ? text : "[]",
    tokensUsed: payload?.usage?.output_tokens,
  };
}

async function callOpenAI(
  params: AnalyzeParams,
  endpoint = "https://api.openai.com/v1/chat/completions",
): Promise<AnalyzeResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    signal: withTimeout(DEFAULT_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(params.promptTemplate, params.extraContext) },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${params.image1Base64}` },
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${params.image2Base64}` },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "OpenAI-compatible request failed");
  }

  const text = payload?.choices?.[0]?.message?.content;
  return {
    text: typeof text === "string" ? text : "[]",
    tokensUsed: payload?.usage?.total_tokens,
  };
}

async function callGoogle(params: AnalyzeParams): Promise<AnalyzeResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  const response = await fetch(
    endpoint,
    {
      method: "POST",
      signal: withTimeout(DEFAULT_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: buildPrompt(params.promptTemplate, params.extraContext) },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: params.image1Base64,
                },
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: params.image2Base64,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Google request failed");
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  return {
    text: typeof text === "string" ? text : "[]",
    tokensUsed: payload?.usageMetadata?.totalTokenCount,
  };
}

export async function analyzeWithProvider(params: AnalyzeParams): Promise<{
  findings: LlmFinding[];
  tokensUsed?: number;
}> {
  let result: AnalyzeResult;

  if (params.provider === "anthropic") {
    result = await callAnthropic(params);
  } else if (params.provider === "openai") {
    result = await callOpenAI(params);
  } else if (params.provider === "google") {
    result = await callGoogle(params);
  } else {
    if (!params.endpoint) {
      throw new Error("Custom provider requires endpoint");
    }
    result = await callOpenAI(params, params.endpoint);
  }

  return {
    findings: parseJsonWithFallback(result.text),
    tokensUsed: result.tokensUsed,
  };
}
