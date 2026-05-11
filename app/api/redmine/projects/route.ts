import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { filterProjectsByQuery, type RedmineProjectRow } from "@/lib/redmine-filter-projects";
import { getRedmineServerConfig } from "@/lib/redmine-server-config";

type RedmineProjectJson = {
  id?: number;
  name?: string;
  identifier?: string;
};

function normalizeProject(raw: unknown): RedmineProjectRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as RedmineProjectJson;
  const id = typeof o.id === "number" ? o.id : Number.parseInt(String(o.id ?? ""), 10);
  if (!Number.isFinite(id) || id < 1) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const identifier = typeof o.identifier === "string" ? o.identifier.trim() : "";
  if (!name && !identifier) return null;
  return {
    id,
    name: name || identifier,
    identifier: identifier || String(id),
  };
}

const PAGE = 100;
const MAX_SCAN = 800;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getRedmineServerConfig();
  if (!env.isComplete) {
    return NextResponse.json(
      { error: "Thiếu REDMINE_URL hoặc REDMINE_API_KEY trong .env" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const aggregated: RedmineProjectRow[] = [];
  let offset = 0;

  try {
    while (offset < MAX_SCAN) {
      const url = `${env.baseUrl}/projects.json?limit=${PAGE}&offset=${offset}`;
      const res = await fetch(url, {
        headers: { "X-Redmine-API-Key": env.apiKey },
      });

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        console.error("Redmine projects non-JSON", res.status, text.slice(0, 400));
        return NextResponse.json(
          { error: `Redmine trả về không phải JSON (${res.status})` },
          { status: 502 },
        );
      }

      if (!res.ok) {
        const errors = (parsed as { errors?: string[] })?.errors;
        const message =
          Array.isArray(errors) && errors.length > 0
            ? errors.join("; ")
            : `Redmine HTTP ${res.status}`;
        console.error("Redmine projects failed", res.status, parsed);
        return NextResponse.json({ error: message }, { status: 400 });
      }

      const body = parsed as { projects?: unknown[]; total_count?: number };
      const batch = Array.isArray(body.projects) ? body.projects : [];
      for (const item of batch) {
        const row = normalizeProject(item);
        if (row) aggregated.push(row);
      }

      const totalCount =
        typeof body.total_count === "number" && Number.isFinite(body.total_count)
          ? body.total_count
          : aggregated.length;

      offset += batch.length;
      if (batch.length === 0 || offset >= totalCount) {
        break;
      }
    }
  } catch (error) {
    console.error("Redmine projects fetch failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gọi Redmine thất bại" },
      { status: 502 },
    );
  }

  const projects = filterProjectsByQuery(aggregated, q, 25);
  return NextResponse.json({ projects, scanned: aggregated.length });
}
