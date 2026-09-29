import { test, expect, type Page } from "@playwright/test";
import { scriptsApi, choose } from "./scriptFixtures";
import { jobResults, respondHistory } from "./executionHistoryFixture";

const jobId = (key: string) => `10000000-0000-4000-8000-${String(["a", "b", "c", "cancel", "block", "i", "s", "archived", "new-job"].indexOf(key) + 1).padStart(12, "0")}`;

async function setup(page: Page) {
  const fixture = await scriptsApi(page);
  const requests: URLSearchParams[] = [];
  const stamp = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();
  const row = (id: string, source: string, status: string, report: any, seconds: number, extra = {}) =>
    ({ id, project_id: "p", revision: 1, source, status, created_at: stamp(seconds), report, ...extra });
  const noise = Array.from({ length: 450 }, (_, i) => row(`noise-${i}`, "cs2", "success", { logs: [], actions: [], error: null }, i + 1, { event: { kind: "ammo_changed" } }));
  const useful = Array.from({ length: 61 }, (_, i) => row(`note-${i}`, "cs2", "success", { logs: [{ level: "info", message: `Useful script note ${i}` }], actions: [] }, 1000 + i));
  const records = [...noise, ...useful,
    row("reward", "cs2", "success", { actions: [{ method: "rewards.trigger", args: ["secret_case", "viewer"], result: { ok: true } }] }, 2000),
    row("warn", "cs2", "success", { logs: [{ level: "warn", message: "player_kill warning before the noise" }] }, 2001),
    row("explicit-error", "cs2", "success", { logs: [{ level: "error", message: "Caught giveaway error" }] }, 2002),
    row("host-error", "cs2", "success", { actions: [{ method: "rewards.trigger", result: { ok: false, code: "reward_paused" } }] }, 2003),
    row("timer-a", "timer", "success", { logs: [{ level: "info", message: "Giveaway A completed" }] }, 2004, { job_id: "a" }),
    row("timer-b", "timer", "failed", { error: "Giveaway B runtime failure" }, 2005, { job_id: "b", revision: 2 }),
    row("timer-c", "timer", "success", { logs: [{ level: "info", message: "Giveaway C completed" }] }, 2006, { job_id: "c", revision: 3 }),
    row("timer-i", "timer", "interrupted", { error: "Worker interrupted; not replayed" }, 2007, { job_id: "i" }),
    row("timer-s", "timer", "skipped", {}, 2008, { job_id: "s" }),
  ];
  records.forEach(record => {
    if ("job_id" in record) record.job_id = jobId(String(record.job_id));
  });
  const jobs = [
    { id: "a", status: "completed", revision: 1 }, { id: "b", status: "failed", revision: 2 },
    { id: "c", status: "completed", revision: 3 }, { id: "cancel", status: "cancelled", revision: 4 },
    { id: "block", status: "blocked", revision: 5, reason: "project_disabled" },
    { id: "i", status: "failed", revision: 1, reason: "execution_interrupted" },
    { id: "s", status: "cancelled", revision: 1, reason: "user_cancelled" },
    { id: "archived", status: "completed", revision: 1 },
  ].map((j, index) => ({ ...j, id: jobId(j.id), project_id: "p", job_key: "ace_giveaway", created_at: stamp(3600 + index * 60), scheduled_for: stamp(2004 + index * 180), payload: { recipient: "viewer" } }));
  await page.route("**/api/v1/broadcasters/123/scripts{,?*}", route => route.fulfill({ json: {
    ...fixture.data, jobs: jobResults(jobs, records).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))), executions: noise.slice(0, 200),
  } }));
  let fail = false;
  await page.route("**/api/v1/broadcasters/123/scripts/executions?*", route => {
    requests.push(new URL(route.request().url()).searchParams);
    return fail ? route.fulfill({ status: 503, json: { message: "History temporarily unavailable" } }) : respondHistory(route, records, { p: "Round rewards" });
  });
  return { records, jobs, requests, failure: (value: boolean) => { fail = value; } };
}
const capture = (page: Page, name: string) => page.screenshot({ path: `.qa/script-history/${name}.png`, animations: "disabled", fullPage: false });
const register = (page: Page) => page.locator(".script-log-register");
const filter = (page: Page, group: string, value: string) => page.getByRole("group", { name: group, exact: true }).getByRole("button", { name: value, exact: true }).click();

test("retained WARN, timer failures and literal search remain visible behind 450 CS2 no-ops", async ({ page }) => {
  const fixture = await setup(page);
  await page.goto("/scripts/logs");
  await expect(register(page)).toContainText("Useful script note");
  await expect(register(page)).not.toContainText("Ammo changed");
  await expect(page.getByRole("status")).toContainText("Showing 50 of 70 retained matches");
  await capture(page, "default-output");
  await filter(page, "Level", "Warn");
  await expect(register(page)).toContainText("player_kill warning before the noise");
  expect(fixture.requests.at(-1)?.get("level")).toBe("warn");
  await page.getByRole("textbox", { name: "Search", exact: true }).fill(" player_kill ");
  await expect.poll(() => fixture.requests.at(-1)?.get("search")).toBe("player_kill");
  await expect(page.locator(".script-execution-line")).toHaveCount(1);
  await capture(page, "warn-search");
  await page.getByRole("textbox", { name: "Search", exact: true }).fill("");
  await filter(page, "Level", "All");
  await filter(page, "Source", "Timer");
  await filter(page, "Status", "Failed");
  await expect(register(page)).toContainText("Giveaway B runtime failure");
  await expect(page.locator(".script-execution-line")).toHaveCount(1);
  expect(fixture.requests.at(-1)?.get("source")).toBe("timer");
  expect(fixture.requests.at(-1)?.get("status")).toBe("failed");
  await capture(page, "timer-failure");
});

test("bounded cursor pages preserve filters and full noisy history stays opt-in", async ({ page }) => {
  const fixture = await setup(page);
  await page.goto("/scripts/logs");
  const first = await register(page).locator("article").evaluateAll(rows => rows.map(r => r.getAttribute("data-execution-id")));
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("page 2");
  const second = await register(page).locator("article").evaluateAll(rows => rows.map(r => r.getAttribute("data-execution-id")));
  expect(second.some(id => first.includes(id))).toBe(false);
  await expect(page.locator(".script-execution-line")).toHaveCount(20);
  await expect(register(page)).toContainText("Giveaway B runtime failure");
  await capture(page, "output-page-two");
  await choose(page, "History view", "All executions");
  await expect(page.getByRole("status")).toContainText("Showing 50 of 520 retained matches · page 1");
  await expect(register(page)).toContainText("Ammo changed");
  await filter(page, "Source", "CS2");
  await choose(page, "Project filter", "Round rewards");
  await filter(page, "Status", "Success");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("page 2");
  expect(fixture.requests.at(-1)?.get("mode")).toBe("all");
  expect(fixture.requests.at(-1)?.get("project_id")).toBe("p");
  expect(fixture.requests.at(-1)?.get("source")).toBe("cs2");
  expect(fixture.requests.at(-1)?.get("status")).toBe("success");
  expect(fixture.requests.at(-1)?.get("cursor")).toBe("50");
  await page.getByRole("button", { name: "Previous page", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("page 1");
  await capture(page, "all-executions");
});

test("Scheduler exact-job Success/Failed histories survive reused keys and noisy recent window", async ({ page }) => {
  const fixture = await setup(page);
  await page.goto("/scripts/scheduler");
  const rows = page.locator(".script-table tbody tr");
  await expect(rows.nth(0)).toContainText("Success");
  await expect(rows.nth(1)).toContainText("Failed");
  await expect(rows.nth(2)).toContainText("Success");
  await expect(rows.nth(3)).toContainText("Cancelled before execution");
  await expect(rows.nth(4)).toContainText("Not run — blocked");
  await expect(rows.nth(5)).toContainText("Interrupted");
  await expect(rows.nth(6)).toContainText("Skipped");
  await expect(rows.nth(7)).toContainText("Execution record unavailable");
  await capture(page, "same-key-scheduler");
  const exactRow = (key: string) => page.locator(`.script-table tbody tr[data-record-id="${jobId(key)}"]`);
  fixture.records.unshift({ ...fixture.records.find(r => r.id === "timer-c")!, id: "new-timer", job_id: jobId("new-job"), created_at: new Date().toISOString() });
  fixture.jobs.find(j => j.id === jobId("block"))!.status = "cancelled";
  fixture.jobs.push({ ...fixture.jobs[0], id: jobId("new-job"), revision: 7, created_at: new Date().toISOString(), scheduled_for: new Date().toISOString() });
  await page.reload();
  await expect(exactRow("a")).toContainText("Success");
  await expect(exactRow("b")).toContainText("Failed");
  await expect(exactRow("new-job")).toContainText("Success");
  await exactRow("a").getByRole("button", { name: "ace_giveaway", exact: true }).click();
  const inspector = page.getByRole("dialog");
  await expect(inspector).toContainText("Giveaway A completed");
  await expect(inspector).not.toContainText("Giveaway B runtime failure");
  expect(fixture.requests.at(-1)?.get("job_id")).toBe(jobId("a"));
  await capture(page, "exact-job-history");
});

test("history fetch failure is recoverable, not a misleading empty log", async ({ page }) => {
  const fixture = await setup(page); fixture.failure(true);
  await page.goto("/scripts/logs");
  await expect(page.locator(".script-history-pager").getByRole("alert")).toContainText("History temporarily unavailable");
  await expect(page.getByText("No execution reports", { exact: true })).toHaveCount(0);
  fixture.failure(false);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(register(page)).toContainText("Useful script note");
});

test("Russian output history and exact scheduler results remain usable at narrow widths", async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => localStorage.setItem("necko_lang", "ru"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/scripts/logs");
  await expect(page.getByRole("combobox", { name: "Показывать", exact: true })).toContainText("С выводом");
  await expect(page.getByRole("status")).toContainText("Показано 50 из 70");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, "output-ru-narrow");
  await page.goto("/scripts/scheduler");
  await expect(page.locator(".script-table tbody tr").nth(0)).toContainText("Успешно");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, "scheduler-ru-narrow");
});
