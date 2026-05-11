import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { runCompareDom } from "@/lib/compare-dom/run-compare-dom";

export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.FIGMA_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "FIGMA_ACCESS_TOKEN is not set. Add a Figma personal access token to .env." },
      { status: 501 },
    );
  }

  let body: {
    figmaUrl?: string;
    fileKey?: string;
    nodeId?: string;
    webUrl?: string;
    basicAuthUsername?: string;
    basicAuthPassword?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const webUrl = typeof body.webUrl === "string" ? body.webUrl.trim() : "";
  if (!webUrl) {
    return NextResponse.json({ error: "webUrl is required" }, { status: 400 });
  }

  try {
    const result = await runCompareDom({
      figmaUrl: body.figmaUrl,
      fileKey: body.fileKey,
      nodeId: body.nodeId,
      webUrl,
      basicAuthUsername: body.basicAuthUsername,
      basicAuthPassword: body.basicAuthPassword,
      figmaToken: token,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("compare-dom failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compare DOM failed" },
      { status: 500 },
    );
  }
}
