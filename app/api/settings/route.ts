import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { getDefaultLlmPromptFromMarkdown } from "@/lib/load-default-llm-prompt";
import { getResolvedLlmSettings } from "@/lib/resolve-llm-settings";

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost") return true;
  if (host.startsWith("127.")) return true;
  if (host.startsWith("10.")) return true;
  if (host.startsWith("192.168.")) return true;
  if (host.startsWith("169.254.")) return true;
  if (host.startsWith("172.")) {
    const second = Number(host.split(".")[1] ?? "0");
    return second >= 16 && second <= 31;
  }
  return false;
}

function validateCustomEndpoint(endpoint?: string | null): string | null {
  if (!endpoint) return null;
  const parsed = new URL(endpoint);
  if (parsed.protocol !== "https:") {
    throw new Error("Custom endpoint must use HTTPS");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Custom endpoint cannot target private networks");
  }
  return parsed.toString();
}

async function resolveUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await getResolvedLlmSettings(userId);
  if (!resolved) {
    return NextResponse.json({ settings: null });
  }

  if (resolved.source === "database") {
    const settings = await db.aiSettings.findUnique({ where: { userId } });
    if (!settings) {
      return NextResponse.json({ settings: null });
    }
    return NextResponse.json({
      settings: {
        ...settings,
        apiKeyMasked: `${settings.apiKeyEncrypted.slice(0, 4)}...${settings.apiKeyEncrypted.slice(-3)}`,
        apiKeyEncrypted: undefined,
        configSource: "database" as const,
      },
    });
  }

  return NextResponse.json({
    settings: {
      provider: resolved.provider,
      model: resolved.model,
      endpoint: resolved.endpoint,
      promptTemplate: resolved.promptTemplate,
      configSource: "env" as const,
      apiKeyMasked: "•••• (LLM_DEFAULT_API_KEY)",
    },
  });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    provider?: "anthropic" | "openai" | "google" | "custom";
    apiKey?: string;
    model?: string;
    endpoint?: string;
    promptTemplate?: string;
  };

  if (!body.provider || !body.apiKey || !body.model) {
    return NextResponse.json(
      { error: "provider, apiKey, and model are required" },
      { status: 400 },
    );
  }

  if (!body.promptTemplate?.includes("{IMAGE_1}") || !body.promptTemplate?.includes("{IMAGE_2}")) {
    return NextResponse.json(
      { error: "Prompt must contain {IMAGE_1} and {IMAGE_2} placeholders" },
      { status: 400 },
    );
  }

  let endpoint: string | null = null;
  if (body.provider === "custom") {
    try {
      endpoint = validateCustomEndpoint(body.endpoint);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid endpoint" },
        { status: 400 },
      );
    }
  }

  const encrypted = encrypt(body.apiKey);
  const promptFallback =
    body.promptTemplate?.trim() || (await getDefaultLlmPromptFromMarkdown());

  const settings = await db.aiSettings.upsert({
    where: { userId },
    update: {
      provider: body.provider,
      apiKeyEncrypted: encrypted,
      model: body.model,
      endpoint,
      promptTemplate: promptFallback,
    },
    create: {
      userId,
      provider: body.provider,
      apiKeyEncrypted: encrypted,
      model: body.model,
      endpoint,
      promptTemplate: promptFallback,
    },
  });

  return NextResponse.json({ settings });
}

