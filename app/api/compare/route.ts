import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    diffImage?: string;
    ssimScore?: number;
    analysisMode?: string;
    llmReport?: string;
    llmProvider?: string;
    llmModel?: string;
    projectId?: string;
  };

  if (!body.originalImage || !body.capturedImage || !body.projectId) {
    return NextResponse.json(
      { error: "originalImage, capturedImage and projectId are required" },
      { status: 400 },
    );
  }

  const comparison = await db.comparison.create({
    data: {
      userId: user.id,
      projectId: body.projectId,
      originalImage: body.originalImage,
      capturedImage: body.capturedImage,
      diffImage: body.diffImage || null,
      ssimScore: body.ssimScore ?? null,
      analysisMode: body.analysisMode || "ssim",
      llmReport: body.llmReport || null,
      llmProvider: body.llmProvider || null,
      llmModel: body.llmModel || null,
    },
  });

  return NextResponse.json({ comparison }, { status: 201 });
}
