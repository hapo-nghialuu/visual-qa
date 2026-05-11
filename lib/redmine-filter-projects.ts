export type RedmineProjectRow = {
  id: number;
  name: string;
  identifier: string;
};

/** Lọc theo tên hoặc identifier (substring, không phân biệt hoa thường). */
export function filterProjectsByQuery(
  projects: RedmineProjectRow[],
  q: string,
  limit = 25,
): RedmineProjectRow[] {
  const t = q.trim().toLowerCase();
  if (!t) {
    return projects.slice(0, limit);
  }
  return projects
    .filter(
      (p) =>
        p.name.toLowerCase().includes(t) || p.identifier.toLowerCase().includes(t),
    )
    .slice(0, limit);
}
