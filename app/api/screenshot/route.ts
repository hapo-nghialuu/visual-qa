import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { parseScreenshotTargetUrl } from "@/lib/screenshot-url-policy";
import { captureUrlToPngFile } from "@/lib/url-page-screenshot";

export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const MAX_BASIC_FIELD = 512;

  let body: { url?: string; basicAuthUsername?: string; basicAuthPassword?: string };
  try {
    body = (await request.json()) as { url?: string; basicAuthUsername?: string; basicAuthPassword?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl = typeof body.url === "string" ? body.url : "";
  let targetHref: string;
  try {
    targetHref = parseScreenshotTargetUrl(rawUrl).href;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid URL" },
      { status: 400 },
    );
  }

  const basicUser =
    typeof body.basicAuthUsername === "string" ? body.basicAuthUsername.trim() : "";
  const basicPass =
    typeof body.basicAuthPassword === "string" ? body.basicAuthPassword : "";
  if (basicUser.length > MAX_BASIC_FIELD || basicPass.length > MAX_BASIC_FIELD) {
    return NextResponse.json(
      { error: `Basic auth fields must be at most ${MAX_BASIC_FIELD} characters` },
      { status: 400 },
    );
  }
  const httpCredentials =
    basicUser.length > 0 || basicPass.length > 0
      ? { username: basicUser, password: basicPass }
      : undefined;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}.png`;
  const filePath = path.join(uploadDir, filename);

  try {
    await captureUrlToPngFile(targetHref, filePath, httpCredentials ? { httpCredentials } : undefined);
  } catch (error) {
    console.error("Screenshot capture failed", error);
    await fs.unlink(filePath).catch(() => undefined);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Screenshot failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: `/uploads/${filename}` });
}
