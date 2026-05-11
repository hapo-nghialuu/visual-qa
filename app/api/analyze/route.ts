import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeWithProvider } from "@/lib/llm-analyze";
import { getResolvedLlmSettings } from "@/lib/resolve-llm-settings";

function toAbsolutePath(urlPath: string): string {
  const normalized = urlPath.startsWith("/") ? urlPath.slice(1) : urlPath;
  return path.join(process.cwd(), "public", normalized);
}

async function readAndResizeBase64(urlPath: string): Promise<string> {
  const fileBuffer = await fs.readFile(toAbsolutePath(urlPath));
  const resized = await sharp(fileBuffer)
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return resized.toString("base64");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    originalImage?: string;
    capturedImage?: string;
    comparisonId?: string;
    extraContext?: string;
  };

  if (!body.originalImage || !body.capturedImage) {
    return NextResponse.json({ error: "Two image urls are required" }, { status: 400 });
  }

  const settings = await getResolvedLlmSettings(user.id);
  if (!settings) {
    return NextResponse.json({ error: "Please configure AI settings" }, { status: 400 });
  }

  try {
    const [image1Base64, image2Base64] = await Promise.all([
      readAndResizeBase64(body.originalImage),
      readAndResizeBase64(body.capturedImage),
    ]);

    const { findings, tokensUsed } = await analyzeWithProvider({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      endpoint: settings.endpoint,
      promptTemplate: settings.promptTemplate,
      image1Base64,
      image2Base64,
      extraContext:
        typeof body.extraContext === "string" && body.extraContext.trim().length > 0
          ? body.extraContext.trim().slice(0, 12_000)
          : null,
    });

    if (body.comparisonId) {
      await db.comparison.updateMany({
        where: {
          id: body.comparisonId,
          userId: user.id,
        },
        data: {
          llmReport: JSON.stringify(findings),
          llmProvider: settings.provider,
          llmModel: settings.model,
          analysisMode: "both",
        },
      });
    }

    return NextResponse.json({ findings, model: settings.model, tokensUsed });
  } catch (error) {
    console.error("Analyze failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed" },
      { status: 500 },
    );
  }
}
