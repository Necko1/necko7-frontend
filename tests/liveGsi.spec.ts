import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { mockApi } from "./fixtures";
import live from "./fixtures/live-vertigo.json" with { type: "json" };
import { respondHistory } from "./executionHistoryFixture";

async function setup(page: Page, unknown = false) {
  await mockApi(page);
  const data = structuredClone(live);
  if (unknown) {
    // Deliberately unobserved data, not a claim about the attached match.
    data.matches[0].data.rounds[3].player.kills = null;
    data.matches[0].data.rounds[3].player.headshot_kills = null;
    data.matches[0].data.rounds[3].player.side = null;
    data.matches[0].data.rounds[3].start = null;
    data.matches[0].data.rounds[3].end = null;
    data.matches[0].data.rounds[3].local_evidence = null;
    data.matches[0].data.rounds[3].events = data.matches[0].data.rounds[3].events.filter(e => ["round_started", "round_ended", "score_changed"].includes(e.event.kind));
    data.matches[0].data.partial = true;
    data.matches[0].data.local_summary.final = false;
    data.matches[0].data.local_summary.stats.deaths = 10;
  }
  const queries: string[] = [];
  await page.route("**/api/v1/broadcasters/123/scripts**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/executions")) {
      const search = new URL(route.request().url()).searchParams.get("search") || "";
      queries.push(search);
      return respondHistory(route, [...Array.from({ length: 350 }, (_, i) => ({
        ...data.executions[0], id: `newer-${i}`, event: { kind: "ammo_changed" }, report: { logs: [], actions: [], error: null },
      })), ...data.executions]);
    }
    const search = new URL(route.request().url()).searchParams.get("execution_search") || "";
    queries.push(search);
    const executions = search
      ? data.executions.filter(e => JSON.stringify(e).toLowerCase().includes(search.toLowerCase()))
      : Array.from({ length: 200 }, (_, i) => ({
          ...data.executions[0], id: `newer-${i}`, event: { kind: "ammo_changed" },
          report: { logs: [{ level: "info", message: "ammo_changed" }], error: null },
        }));
    await route.fulfill({ json: { ...data, executions } });
  });
  await page.route("**/api/v1/broadcasters/123/logs**", async (route) => {
    const url = new URL(route.request().url());
    const logs = data.operational_logs;
    if (url.pathname.endsWith("/summary")) {
      return route.fulfill({ json: { info_last_24h: logs.filter(l => l.level === "INFO").length,
        warnings_last_24h: 2, errors_last_24h: 0, total_last_24h: logs.length } });
    }
    const items = logs.filter(l => !url.searchParams.get("level") || l.level === url.searchParams.get("level"));
    return route.fulfill({ json: { items, total: items.length, offset: 0, limit: 50 } });
  });
  return queries;
}

async function capture(page: Page, info: TestInfo, name: string) {
  const dir = resolve("test-results/live-gsi");
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}

test("live PostgreSQL replay displays fifteen rounds, final totals and the actual halftime relabel", async ({ page }, info) => {
  await setup(page);
  await page.goto("/scripts/matches");
  await expect(page.getByRole("cell", { name: "15", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Continuous", exact: true })).toBeVisible();
  await capture(page, info, "matches-list");
  await page.getByRole("button", { name: "de_vertigo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "de_vertigo" });
  await expect(dialog.getByRole("heading", { name: "Final local totals" })).toBeVisible();
  const totals = dialog.getByRole("region", { name: "Local player totals" });
  await expect(totals.locator("dd")).toHaveText(["8", "2", "11", "5", "26"]);
  const rounds = dialog.locator(".script-rounds tbody tr");
  await expect(rounds).toHaveCount(15);
  await expect(rounds.nth(0)).toContainText("2 / 2");
  await expect(rounds.nth(1)).toContainText("0 / 0");
  await expect(rounds.nth(3)).toContainText("1 / 0");
  await expect(rounds.nth(8)).toContainText("Side swap: 2 : 6 → 6 : 2");
  await expect(rounds.nth(13)).toContainText("7 : 6 → 8 : 6");
  await expect(rounds.nth(14)).toContainText("8 : 6 → 9 : 6");
  await expect(dialog).not.toContainText("Unknown / Unknown");
  await page.setViewportSize({ width: 1440, height: 1200 });
  await capture(page, info, "match-fifteen-rounds");
  await rounds.nth(14).getByRole("button", { name: "15", exact: true }).click();
  await dialog.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(dialog.locator(".script-round-detail")).toContainText("Round ended");
  await capture(page, info, "final-round");
});

test("unknown remains distinct from zero and last observed totals are not called final on a narrow screen", async ({ page }, info) => {
  await setup(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/scripts/matches");
  await page.getByRole("button", { name: "de_vertigo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "de_vertigo" });
  await expect(dialog.getByRole("heading", { name: "Last observed local totals" })).toBeVisible();
  await expect(dialog).toContainText("Partial observations");
  const rounds = dialog.locator(".script-rounds tbody tr");
  await expect(rounds.nth(1).locator("td").last()).toHaveText("0 / 0");
  await expect(rounds.nth(3).locator("td").last()).toHaveText("Unknown / Unknown");
  await dialog.locator(".script-table-wrap").evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await capture(page, info, "unknown-last-observed-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await rounds.nth(14).getByRole("button", { name: "15", exact: true }).scrollIntoViewIfNeeded();
  await expect(rounds.nth(14).getByRole("button", { name: "15", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1200 });
  await dialog.evaluate(el => { el.scrollTop = 0; });
  await expect(dialog).toHaveCSS("width", "760px");
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await capture(page, info, "unknown-versus-zero");
});

test("player_kill search reaches retained history and displays all eight persisted executions", async ({ page }, info) => {
  const queries = await setup(page);
  await page.goto("/scripts/logs");
  await page.getByRole("textbox", { name: "Search", exact: true }).fill(" player_kill ");
  await expect.poll(() => queries.includes("player_kill")).toBe(true);
  await expect(page.locator(".script-execution-line")).toHaveCount(8);
  await expect(page.getByText("Showing 8 of 8 retained matches · page 1", { exact: true })).toBeVisible();
  await capture(page, info, "eight-player-kill-executions");
  await page.locator(".script-execution-line").last().click();
  const dialog = page.getByRole("dialog", { name: "Live evidence" });
  await expect(dialog).toContainText("Player kill");
  await dialog.getByText("Identifiers and raw metadata", { exact: true }).click();
  await expect(dialog).toContainText('"source_seq": 41');
});

test("operational INFO contains lifecycle only while failed and interrupted executions remain visible warnings", async ({ page }, info) => {
  await setup(page);
  await page.goto("/logs?level=INFO");
  await expect(page.getByText(/created script project/)).toBeVisible();
  await expect(page.getByText(/published script project/).first()).toBeVisible();
  await expect(page.getByText(/enabled script project/)).toBeVisible();
  await expect(page.getByText(/script\.execution/)).toHaveCount(0);
  await capture(page, info, "operational-info-no-execution-spam");
  await page.goto("/logs?level=WARN");
  await expect(page.getByText("Script execution failed", { exact: true })).toBeVisible();
  await expect(page.getByText("Script execution interrupted; possible side effects were not replayed", { exact: true })).toBeVisible();
  await capture(page, info, "operational-warnings-preserved");
});
