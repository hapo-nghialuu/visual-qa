import { db } from "@/lib/db";
import { getRedmineServerConfig, type RedmineEnvDefaults } from "@/lib/redmine-server-config";

export type ResolvedRedmine =
  | { configured: false }
  | {
      configured: true;
      baseUrl: string;
      apiKey: string;
      defaults: RedmineEnvDefaults;
    };

function mergeDefaults(
  envDefaults: RedmineEnvDefaults,
  row: {
    defaultProjectId: number | null;
    defaultTrackerId: number | null;
    defaultPriorityId: number | null;
  } | null,
): RedmineEnvDefaults {
  if (!row) return envDefaults;
  return {
    projectId: row.defaultProjectId ?? envDefaults.projectId,
    trackerId: row.defaultTrackerId ?? envDefaults.trackerId,
    priorityId: row.defaultPriorityId ?? envDefaults.priorityId,
  };
}

/** URL + API key chỉ từ .env; default project/tracker/priority: form (DB) ghi đè từng trường, thiếu thì lấy .env. */
export async function resolveRedmineForUser(userId: string): Promise<ResolvedRedmine> {
  const env = getRedmineServerConfig();
  if (!env.isComplete) {
    return { configured: false };
  }

  const row = await db.redmineSettings.findUnique({ where: { userId } });
  return {
    configured: true,
    baseUrl: env.baseUrl,
    apiKey: env.apiKey,
    defaults: mergeDefaults(env.defaults, row),
  };
}
