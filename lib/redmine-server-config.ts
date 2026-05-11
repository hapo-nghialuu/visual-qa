function parseOptionalPositiveInt(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return n;
}

export type RedmineEnvDefaults = {
  projectId?: number;
  trackerId?: number;
  priorityId?: number;
};

export function getRedmineServerConfig(): {
  baseUrl: string;
  apiKey: string;
  defaults: RedmineEnvDefaults;
  isComplete: boolean;
} {
  const baseUrl = (process.env.REDMINE_URL ?? "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.REDMINE_API_KEY ?? "").trim();
  const defaults: RedmineEnvDefaults = {
    projectId: parseOptionalPositiveInt(process.env.REDMINE_DEFAULT_PROJECT_ID),
    trackerId: parseOptionalPositiveInt(process.env.REDMINE_DEFAULT_TRACKER_ID),
    priorityId: parseOptionalPositiveInt(process.env.REDMINE_DEFAULT_PRIORITY_ID),
  };
  const isComplete = baseUrl.length > 0 && apiKey.length > 0;
  return { baseUrl, apiKey, defaults, isComplete };
}
