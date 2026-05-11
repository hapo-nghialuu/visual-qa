import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveRedmineForUser } from "@/lib/resolve-redmine-settings";

export async function GET() {
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

  const resolved = await resolveRedmineForUser(user.id);
  if (!resolved.configured) {
    return NextResponse.json({
      configured: false,
      defaults: { projectId: null, trackerId: null, priorityId: null },
    });
  }

  return NextResponse.json({
    configured: true,
    defaults: {
      projectId: resolved.defaults.projectId ?? null,
      trackerId: resolved.defaults.trackerId ?? null,
      priorityId: resolved.defaults.priorityId ?? null,
    },
  });
}
