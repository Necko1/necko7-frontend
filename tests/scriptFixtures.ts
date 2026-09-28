import type { Page } from "@playwright/test";
import { mockApi } from "./fixtures";

export function scriptData() {
  const now = new Date(Date.now() - 180000).toISOString();
  const main = "fn on_event(ctx) {\n    log.info(ctx.event.kind);\n}";
  const draft = {
    "main.rhai": main,
    "events/_folder.rhai": "// Folder module\n",
    "events/rounds.rhai": "fn reward(ctx) {}",
    "helpers.rhai": "fn helper() {}",
  };
  const report = {
    dry_run: true,
    duration_ms: 12,
    logs: [{ level: "info", message: "Round reward would be delivered" }],
    actions: [
      {
        method: "reward.trigger",
        args: ["round_drop", "viewer"],
        dry_run: true,
        result: { code: "dry_run" },
      },
    ],
    error: null,
  };
  return {
    projects: [
      {
        id: "p",
        name: "Round rewards",
        enabled: true,
        draft_version: 5,
        active_revision: 2,
        draft,
        live_files: draft,
      },
      {
        id: "q",
        name: "Chat timers",
        enabled: false,
        draft_version: 1,
        active_revision: null,
        draft: { "main.rhai": "fn on_timer(ctx) {}" },
        live_files: null,
      },
    ],
    revisions: [
      { project_id: "p", revision: 2, created_at: now },
      { project_id: "p", revision: 1, created_at: now },
    ],
    storage: [
      {
        project_id: "p",
        key: "round_rewards",
        value: { delivered: 3, viewers: ["pixelpilot", "nova"] },
        updated_at: now,
      },
      {
        project_id: "q",
        key: "last_message",
        value: "Welcome to the channel",
        updated_at: now,
      },
    ],
    jobs: ["scheduled", "blocked", "queued", "completed", "cancelled"].map(
      (status, i) => ({
        id: `j${i}`,
        project_id: "p",
        job_key: [
          "hide_round_drop",
          "retry_round_reward",
          "notify_viewer",
          "round_cleanup",
          "old_reward",
        ][i],
        status,
        revision: 1,
        scheduled_for: now,
        reason: status === "blocked" ? "project_disabled" : null,
        payload: { reward: "round_drop" },
      }),
    ),
    executions: [
      {
        id: "e1",
        project_id: "p",
        revision: 2,
        source: "cs2",
        status: "success",
        created_at: now,
        event: { kind: "round_ended" },
        report: { ...report, dry_run: false },
      },
      {
        id: "e2",
        project_id: "p",
        revision: 1,
        source: "timer",
        status: "failed",
        job_id: "j3",
        created_at: now,
        report: {
          duration_ms: 34,
          error: "rounds.rhai: Unknown reward alias (line 2)",
          logs: [{ level: "warn", message: "Reward was removed" }],
          actions: [],
        },
      },
      {
        id: "e3",
        project_id: "q",
        source: "dry_run",
        status: "success",
        created_at: now,
        report,
      },
    ],
    matches: [
      {
        id: "m",
        map: "de_anubis",
        created_at: now,
        completed_at: now,
        data: {
          end_reason: "game_over",
          updated_at: now,
          current_round: null,
          state: {
            match: {
              mode: "competitive",
              phase: "game_over",
              score: { ct: 3, t: 5 },
            },
          },
          rounds: Array.from({ length: 8 }, (_, index) => ({
            index,
            completed: true,
            started_at: now,
            ended_at: now,
            winner: index < 3 ? "CT" : "T",
            score_before: { ct: Math.min(index, 3), t: Math.max(index - 3, 0) },
            score_after: {
              ct: Math.min(index + 1, 3),
              t: Math.max(index - 2, 0),
            },
            player: {
              side: "CT",
              kills: index === 3 ? null : index % 3,
              headshot_kills: index === 3 ? null : 0,
              health: index === 3 ? null : 100,
            },
            events: [{ timestamp: now, event: { kind: "round_ended" } }],
          })),
        },
      },
    ],
    snapshots: [
      {
        id: 1,
        created_at: now,
        events: [{ kind: "round_ended" }, { kind: "player_kill" }],
      },
    ],
  };
}
export async function scriptsApi(
  page: Page,
  options: { empty?: boolean; createError?: boolean } = {},
) {
  await mockApi(page);
  const data = scriptData();
  if (options.empty)
    for (const key of Object.keys(data))
      data[key as keyof typeof data] = [] as never;
  const actions: Record<string, any>[] = [];
  let createError = !!options.createError;
  await page.route("**/api/v1/broadcasters/123/scripts{,?*}", async (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({ json: data });
    const body = route.request().postDataJSON();
    actions.push(body);
    const project = data.projects.find((p) => p.id === body.project_id);
    if (body.action === "create") {
      if (createError) {
        createError = false;
        return route.fulfill({
          status: 400,
          json: { message: "That project name is already in use" },
        });
      }
      data.projects.unshift({
        ...structuredClone(scriptData().projects[1]),
        id: "new",
        name: body.name,
      });
      return route.fulfill({ json: { id: "new" } });
    }
    if (body.action === "save" && project) {
      project.draft = body.files;
      project.draft_version++;
      return route.fulfill({ json: { version: project.draft_version } });
    }
    if (body.action === "publish" && project) {
      project.active_revision = 3;
      project.live_files = structuredClone(project.draft);
    }
    if (body.action === "rollback" && project)
      project.active_revision = body.revision;
    if (body.action === "revision")
      return route.fulfill({
        json: {
          files: {
            "main.rhai": `// Published version ${body.revision}\nfn on_event(ctx) {}`,
          },
        },
      });
    if (body.action === "validate")
      return route.fulfill({
        status: 400,
        json: { message: "main.rhai: Syntax error (line 2, position 3)" },
      });
    if (body.action === "test")
      return route.fulfill({
        json: data.executions[2]?.report ?? {
          dry_run: true,
          logs: [],
          actions: [],
        },
      });
    if (body.action === "snapshot")
      return route.fulfill({
        json: {
          event: { kind: "round_ended" },
          state: { match: { map: "de_anubis" } },
          previous: { round: { completed_rounds: 2 } },
          current_match: { rounds: [] },
        },
      });
    if (body.action === "storage_clear")
      data.storage = data.storage.filter(
        (r) => r.project_id !== body.project_id,
      );
    if (body.action === "storage_delete")
      data.storage = data.storage.filter(
        (r) => !(r.project_id === body.project_id && r.key === body.key),
      );
    if (body.action === "storage_set") {
      const row = data.storage.find(
        (r) => r.project_id === body.project_id && r.key === body.key,
      );
      if (row) row.value = body.value;
      else
        data.storage.push({
          project_id: body.project_id,
          key: body.key,
          value: body.value,
          updated_at: new Date().toISOString(),
        });
    }
    if (body.action === "run_job" || body.action === "cancel_job") {
      const job = data.jobs.find((j) => j.id === body.job_id);
      if (job) job.status = body.action === "run_job" ? "queued" : "cancelled";
    }
    return route.fulfill({ json: { ok: true } });
  });
  return { data, actions };
}

export async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
