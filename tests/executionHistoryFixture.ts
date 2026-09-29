import type { Route } from "@playwright/test";

type RecordRow = { id: string; project_id?: string; status?: string; created_at?: string; [key: string]: any };
export function noteworthy(row: RecordRow) {
  const report = row.report ?? {};
  return row.source !== "cs2" || ["failed", "interrupted", "skipped"].includes(row.status ?? "")
    || !!report.error || !!report.logs?.length || (report.actions ?? []).some((a: any) => a.error || a.result?.ok === false
      || !["storage.get", "scheduler.exists", "rewards.get", "chat.user_stats", "chat.recent_chatters", "users.recent_chatters", "random.pick"].includes(a.method));
}
// Browser fixtures model the wire contract; PostgreSQL tests exercise the real SQL predicates/cursors.
export function historyPage(records: RecordRow[], params: URLSearchParams, names: Record<string, string> = {}) {
  const search = (params.get("search") ?? "").trim().toLowerCase();
  const level = params.get("level");
  const filtered = records.filter(row => (!params.get("project_id") || row.project_id === params.get("project_id"))
    && (!params.get("job_id") || row.job_id === params.get("job_id"))
    && (!params.get("status") || row.status === params.get("status"))
    && (!params.get("source") || row.source === params.get("source"))
    && (!level || row.report?.logs?.some((l: any) => l.level === level)
      || (level === "error" && (row.report?.error || ["failed", "interrupted"].includes(row.status ?? "") || row.report?.actions?.some((a: any) => a.error || a.result?.ok === false))))
    && (params.get("mode") === "all" || noteworthy(row))
    && (JSON.stringify(row) + (names[row.project_id ?? ""] ?? "")).toLowerCase().includes(search));
  const limit = Number(params.get("limit") || 50);
  const offset = Number(params.get("cursor") || 0);
  return { executions: filtered.slice(offset, offset + limit), total: filtered.length,
    next_cursor: offset + limit < filtered.length ? String(offset + limit) : null, start_cursor: "0", retained_days: 30 };
}
export async function respondHistory(route: Route, records: RecordRow[], names: Record<string, string> = {}) {
  return route.fulfill({ json: historyPage(records, new URL(route.request().url()).searchParams, names) });
}
export function jobResults<T extends RecordRow>(jobs: T[], executions: RecordRow[]) {
  return jobs.map(job => ({ ...job, last_execution: executions.find(e => e.job_id === job.id) ?? null }));
}
