import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getResolvedLlmSettings } from "@/lib/resolve-llm-settings";

async function resolveUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function requestWithTimeout(url: string, init: RequestInit) {
  const started = Date.now();
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(10000),
  });
  return { response, latency: Date.now() - started };
}

export async function POST() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getResolvedLlmSettings(userId);
  if (!settings) {
    return NextResponse.json(
      { success: false, message: "No settings found. Save in Settings or set LLM_DEFAULT_* env vars." },
      { status: 400 },
    );
  }

  const apiKey = settings.apiKey;

  try {
    let request: Promise<{ response: Response; latency: number }>;

    if (settings.provider === "anthropic") {
      request = requestWithTimeout("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "test" }],
        }),
      });
    } else if (settings.provider === "openai") {
      request = requestWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "test" }],
        }),
      });
    } else if (settings.provider === "google") {
      request = requestWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "test" }] }],
          }),
        },
      );
    } else {
      if (!settings.endpoint) {
        return NextResponse.json(
          { success: false, message: "Custom endpoint is missing" },
          { status: 400 },
        );
      }
      request = requestWithTimeout(settings.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [{ role: "user", content: "test" }],
        }),
      });
    }

    const { response, latency } = await request;
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { success: false, message: text || "Connection failed", latency },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, message: "Connection successful", latency });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 400 },
    );
  }
}
