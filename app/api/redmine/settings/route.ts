import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRedmineServerConfig } from "@/lib/redmine-server-config";

async function resolveUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

function parseOptionalPositiveInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getRedmineServerConfig();
  const row = await db.redmineSettings.findUnique({ where: { userId } });

  return NextResponse.json({
    connectionConfigured: env.isComplete,
    settings: row
      ? {
          defaultProjectId: row.defaultProjectId,
          defaultTrackerId: row.defaultTrackerId,
          defaultPriorityId: row.defaultPriorityId,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    defaultProjectId?: unknown;
    defaultTrackerId?: unknown;
    defaultPriorityId?: unknown;
  };

  const defaultProjectId = parseOptionalPositiveInt(body.defaultProjectId);
  const defaultTrackerId = parseOptionalPositiveInt(body.defaultTrackerId);
  const defaultPriorityId = parseOptionalPositiveInt(body.defaultPriorityId);

  await db.redmineSettings.upsert({
    where: { userId },
    create: {
      userId,
      defaultProjectId,
      defaultTrackerId,
      defaultPriorityId,
    },
    update: {
      defaultProjectId,
      defaultTrackerId,
      defaultPriorityId,
    },
  });

  return NextResponse.json({ ok: true });
}
