import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveRedmineForUser } from "@/lib/resolve-redmine-settings";

type CreateIssuePayload = {
  project_id?: unknown;
  tracker_id?: unknown;
  subject?: unknown;
  description?: unknown;
  priority_id?: unknown;
  status_id?: unknown;
  category_id?: unknown;
  assigned_to_id?: unknown;
  parent_issue_id?: unknown;
  is_private?: unknown;
  estimated_hours?: unknown;
};

function asOptionalNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number.parseInt(String(v), 10);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function asOptionalBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
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

  const resolved = await resolveRedmineForUser(user.id);
  if (!resolved.configured) {
    return NextResponse.json(
      { error: "Thiếu REDMINE_URL hoặc REDMINE_API_KEY trong .env" },
      { status: 503 },
    );
  }

  const { baseUrl, apiKey } = resolved;

  let body: CreateIssuePayload;
  try {
    body = (await request.json()) as CreateIssuePayload;
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không phải JSON hợp lệ" }, { status: 400 });
  }

  const projectId = asOptionalNumber(body.project_id);
  const trackerId = asOptionalNumber(body.tracker_id);
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (projectId == null || trackerId == null) {
    return NextResponse.json(
      { error: "Mã project và mã tracker là bắt buộc" },
      { status: 400 },
    );
  }
  if (!subject) {
    return NextResponse.json({ error: "Tiêu đề (subject) là bắt buộc" }, { status: 400 });
  }

  const issue: Record<string, unknown> = {
    project_id: projectId,
    tracker_id: trackerId,
    subject,
    description,
  };

  const priorityId = asOptionalNumber(body.priority_id);
  if (priorityId != null) issue.priority_id = priorityId;

  const statusId = asOptionalNumber(body.status_id);
  if (statusId != null) issue.status_id = statusId;

  const categoryId = asOptionalNumber(body.category_id);
  if (categoryId != null) issue.category_id = categoryId;

  const assignedToId = asOptionalNumber(body.assigned_to_id);
  if (assignedToId != null) issue.assigned_to_id = assignedToId;

  const parentIssueId = asOptionalNumber(body.parent_issue_id);
  if (parentIssueId != null) issue.parent_issue_id = parentIssueId;

  const isPrivate = asOptionalBool(body.is_private);
  if (isPrivate !== undefined) issue.is_private = isPrivate;

  const est = asOptionalNumber(body.estimated_hours);
  if (est != null) issue.estimated_hours = est;

  const url = `${baseUrl}/issues.json`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Redmine-API-Key": apiKey,
      },
      body: JSON.stringify({ issue }),
    });
  } catch (error) {
    console.error("Redmine fetch failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gọi Redmine thất bại" },
      { status: 502 },
    );
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    console.error("Redmine non-JSON response", res.status, text.slice(0, 500));
    return NextResponse.json(
      { error: `Redmine trả về lỗi (${res.status})`, detail: text.slice(0, 2000) },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const errors = (parsed as { errors?: string[] })?.errors;
    const message =
      Array.isArray(errors) && errors.length > 0
        ? errors.join("; ")
        : `Redmine HTTP ${res.status}`;
    console.error("Redmine create issue failed", res.status, parsed);
    return NextResponse.json({ error: message, detail: parsed }, { status: 400 });
  }

  const id = (parsed as { issue?: { id?: number } })?.issue?.id;
  if (typeof id !== "number") {
    console.error("Redmine missing issue id", parsed);
    return NextResponse.json({ error: "Phản hồi Redmine không có mã issue" }, { status: 502 });
  }

  const issueUrl = `${baseUrl}/issues/${id}`;
  return NextResponse.json({ issue: { id }, issueUrl });
}
