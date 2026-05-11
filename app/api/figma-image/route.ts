import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchFigmaRenderedPngBuffer } from "@/lib/figma-node-png";
import { resolveFigmaFileNode } from "@/lib/figma-node-parse";

export const maxDuration = 60;

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

  let body: { figmaUrl?: string; fileKey?: string; nodeId?: string };
  try {
    body = (await request.json()) as { figmaUrl?: string; fileKey?: string; nodeId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let ref: { fileKey: string; nodeId: string };
  try {
    ref = resolveFigmaFileNode(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Figma input" },
      { status: 400 },
    );
  }

  let buf: Buffer;
  try {
    buf = await fetchFigmaRenderedPngBuffer({
      fileKey: ref.fileKey,
      nodeId: ref.nodeId,
      token,
      scale: "1",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Figma fetch failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}.png`;
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buf);

  return NextResponse.json({
    url: `/uploads/${filename}`,
    fileKey: ref.fileKey,
    nodeId: ref.nodeId,
  });
}
