import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";
import { scriptsApi, choose } from "./scriptFixtures";

test("Monaco rapid save preserves the latest draft and publication is explicit", async ({
  page,
}) => {
  const { data, actions } = await scriptsApi(page);
  await page.goto("/scripts/editor");
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// draft only");
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Control+s");
  await expect.poll(() => actions.map((a) => a.action)).toEqual(["save"]);
  expect(data.projects[0].draft["main.rhai"]).toContain("// draft only");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  expect(actions).toHaveLength(1);
  await page
    .getByRole("dialog", { name: "Publish draft?" })
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await expect
    .poll(() => actions.map((a) => a.action))
    .toEqual(["save", "publish"]);
  await expect(page.getByText("Live version 3", { exact: true })).toBeVisible();
});

test("create dialog validates, focuses, retains server errors and prevents duplicate submission", async ({
  page,
}) => {
  const { actions } = await scriptsApi(page, { createError: true });
  await page.goto("/scripts/editor");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Create project" });
  await expect(dialog.getByLabel("Project name")).toBeFocused();
  await dialog.getByRole("button", { name: "Create project" }).click();
  await expect(dialog).toContainText("Enter a project name");
  expect(actions).toHaveLength(0);
  await dialog.getByLabel("Project name").fill("New automation");
  await page.keyboard.press("Enter");
  await expect(dialog).toContainText("already in use");
  await expect(dialog.getByLabel("Project name")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(dialog).not.toBeVisible();
  expect(actions.filter((a) => a.action === "create")).toHaveLength(2);
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("all Scripts deep links activate the parent and inspectors never cross sections", async ({
  page,
}) => {
  await scriptsApi(page);
  await page.route("**/api/v1/broadcasters/123/cs2**", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/pairing")
        ? {
            code: "ABCD-2345",
            expires_at: new Date(Date.now() + 300000).toISOString(),
          }
        : { device: null },
    }),
  );
  for (const section of [
    "editor",
    "storage",
    "matches",
    "scheduler",
    "logs",
    "cs2",
  ]) {
    await page.goto("/scripts/" + section);
    await expect(
      page.locator('aside a[href="/scripts/editor"]'),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.goto("/scripts/matches");
  await page.getByRole("button", { name: "de_anubis", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "de_anubis" })).toContainText(
    "Round",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Local Storage", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "round_rewards", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Scripts", exact: true })
    .getByRole("link", { name: "Logs", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/scripts\/storage$/);
  await page.goForward();
  await expect(page).toHaveURL(/scripts\/logs$/);
});

test("file tree hides markers, inline renames and moves persist without losing open code", async ({
  page,
}) => {
  const { actions, data } = await scriptsApi(page);
  await page.goto("/scripts/editor");
  await expect(page.getByText("_folder.rhai", { exact: true })).toHaveCount(0);
  await page.getByText("rounds.rhai", { exact: true }).click();
  await page.getByRole("button", { name: "File actions" }).click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Rename file or folder" })
    .fill("rewards.rhai");
  await page.keyboard.press("Enter");
  await expect(page.locator(".script-code-footer")).toContainText(
    "events/rewards.rhai",
  );
  await page.getByRole("button", { name: "File actions" }).click();
  await page.getByRole("menuitem", { name: "Move to..." }).click();
  const move = page.getByRole("dialog", { name: "Move file or folder" });
  await move.getByLabel("Destination path").fill("../bad.rhai");
  await move.getByRole("button", { name: "Move", exact: true }).click();
  await expect(move.getByRole("alert")).toBeVisible();
  await move.getByLabel("Destination path").fill("rewards.rhai");
  await move.getByRole("button", { name: "Move", exact: true }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect.poll(() => actions.map((a) => a.action)).toEqual(["save"]);
  expect(data.projects[0].draft["rewards.rhai"]).toBe("fn reward(ctx) {}");
  expect(data.projects[0].draft).not.toHaveProperty("events/rounds.rhai");
});

test("history inspection never activates code and rollback requires confirmation", async ({
  page,
}) => {
  const { actions } = await scriptsApi(page);
  await page.goto("/scripts/editor");
  await page.getByRole("button", { name: "Version history" }).click();
  const history = page.getByRole("dialog", { name: "Version history" });
  await history.getByRole("button", { name: /Version 1/ }).click();
  await expect(history.locator("pre")).toContainText("Published version 1");
  expect(actions.map((a) => a.action)).toEqual(["revision"]);
  await history.getByRole("button", { name: "Activate version 1" }).click();
  await page
    .getByRole("dialog", { name: "Activate version 1?" })
    .getByRole("button", { name: "Activate version", exact: true })
    .click();
  await expect
    .poll(() => actions.map((a) => a.action))
    .toEqual(["revision", "rollback"]);
});

test("recorded contexts, diagnostics, safe results and unsaved cross-tab buffers", async ({
  page,
}) => {
  const { actions } = await scriptsApi(page);
  await page.goto("/scripts/editor");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(page.getByRole("region", { name: "Diagnostics" })).toContainText(
    "Syntax error",
  );
  await page.getByRole("button", { name: "Go to diagnostic" }).click();
  await expect
    .poll(() =>
      page.evaluate(() => !!document.activeElement?.closest(".monaco-editor")),
    )
    .toBe(true);
  await expect(page.locator(".squiggly-error")).not.toHaveCount(0);
  await page.getByText("helpers.rhai", { exact: true }).click();
  await expect(page.locator(".squiggly-error")).toHaveCount(0);
  await page.getByRole("button", { name: "main.rhai", exact: true }).click();
  await expect(page.locator(".squiggly-error")).not.toHaveCount(0);
  await page.getByRole("button", { name: /Test draft/ }).click();
  await page.getByRole("combobox", { name: "Recorded event" }).click();
  await page.getByRole("option", { name: /Round ended/ }).click();
  await expect(page.locator(".script-context-summary")).toContainText(
    "Round ended",
  );
  await page.getByRole("button", { name: "Run dry test" }).click();
  await expect(
    page.getByText("Planned actions", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Simulated", { exact: true })).toBeVisible();
  expect(
    actions.find((a) => a.action === "test")?.context.previous.round
      .completed_rounds,
  ).toBe(2);
  await page.getByText("Edit normalized context (JSON)").click();
  await page.getByLabel("Test context").fill("[]");
  await expect(
    page.getByRole("button", { name: "Run dry test" }),
  ).toBeDisabled();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" // retained");
  await page.getByRole("link", { name: "Matches", exact: true }).click();
  await page.getByRole("link", { name: "Editor", exact: true }).click();
  await expect(page.locator(".view-lines")).toContainText("retained");
  await page
    .getByRole("link", { name: "Rewards", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Leave with unsaved changes?" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/scripts\/editor$/);
});

test("storage mutations are scoped, validated and destructively confirmed", async ({
  page,
}) => {
  const { actions } = await scriptsApi(page);
  await page.goto("/scripts/storage");
  await expect(page.getByRole("button", { name: "Add key" })).toBeDisabled();
  await choose(page, "Project filter", "Round rewards");
  await page.getByRole("button", { name: "Edit round_rewards" }).click();
  const edit = page.getByRole("dialog", { name: "Edit storage value" });
  await edit.getByLabel("JSON value").fill("{");
  await edit.getByRole("button", { name: "Save value" }).click();
  await expect(edit).toContainText("Enter valid JSON");
  await edit.getByLabel("JSON value").fill('{"delivered":4}');
  await edit.getByRole("button", { name: "Save value" }).click();
  await expect(edit).not.toBeVisible();
  await page
    .getByRole("button", { name: "Clear storage", exact: true })
    .click();
  const clear = page.getByRole("dialog", { name: "Clear project storage?" });
  await clear.getByRole("button", { name: "Clear storage" }).click();
  expect(actions).toHaveLength(1);
  await clear.getByLabel(/Type CLEAR/).fill("CLEAR");
  await clear.getByRole("button", { name: "Clear storage" }).click();
  await expect
    .poll(() => actions.map((a) => a.action))
    .toEqual(["storage_set", "storage_clear"]);
  await expect(
    page.getByRole("button", { name: "last_message", exact: true }),
  ).toHaveCount(0);
});

test("scheduler separates lifecycle from execution and confirmed runs consume blocked jobs", async ({
  page,
}) => {
  const { actions } = await scriptsApi(page);
  await page.goto("/scripts/scheduler");
  await page
    .getByRole("group", { name: "Job status" })
    .getByRole("button", { name: "Blocked", exact: true })
    .click();
  await expect(
    page.getByText("Project disabled", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run now", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Run this job now?" });
  await expect(dialog).toContainText("even if the project is disabled");
  await page.keyboard.press("Escape");
  expect(actions).toHaveLength(0);
  await page.getByRole("button", { name: "Run now", exact: true }).click();
  await dialog.getByRole("button", { name: "Run now" }).click();
  await expect.poll(() => actions.map((a) => a.action)).toEqual(["run_job"]);
  await expect(page.getByRole("button", { name: "Leave as is" })).toHaveCount(
    0,
  );
  await page
    .getByRole("group", { name: "Job status" })
    .getByRole("button", { name: "All", exact: true })
    .click();
  await choose(page, "Last execution result", "Failed");
  await expect(
    page.getByRole("button", { name: "round_cleanup", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Run now", exact: true }),
  ).toHaveCount(0);
});

test("logs filters and eight-round match summaries lead with useful details", async ({
  page,
}) => {
  await scriptsApi(page);
  await page.goto("/scripts/logs");
  await page
    .getByRole("group", { name: "Status" })
    .getByRole("button", { name: "Failed", exact: true })
    .click();
  await expect(page.locator(".terminal-record")).toHaveCount(1);
  await page.locator(".script-execution-line").click();
  const details = page.getByRole("dialog", { name: "Round rewards" });
  await expect(details).toContainText("Unknown reward alias");
  expect(
    await details.locator("details").last().getAttribute("open"),
  ).toBeNull();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Matches", exact: true }).click();
  await page.getByRole("button", { name: "de_anubis", exact: true }).click();
  const match = page.getByRole("dialog", { name: "de_anubis" });
  await expect(match.locator("tbody tr")).toHaveCount(8);
  await expect(match).toContainText("Continuous observations");
  await match.getByRole("button", { name: "4", exact: true }).click();
  await expect(match).toContainText("Unknown");
  await expect(match).not.toContainText("Surrender");
});

for (const width of [1440, 1024, 390])
  test("populated Scripts fit " + width + "px", async ({ page }) => {
    await scriptsApi(page);
    await page.setViewportSize({ width, height: 900 });
    for (const section of [
      "editor",
      "storage",
      "scheduler",
      "logs",
      "matches",
    ]) {
      await page.goto("/scripts/" + section);
      await expect(
        page.getByRole("heading", { name: "Scripts", exact: true }),
      ).toBeVisible();
      if (section === "editor")
        await expect(page.locator(".monaco-editor")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: "../.qa/ui-review/final-" + section + "-" + width + ".png",
        fullPage: true,
      });
    }
  });
test("empty projects remain sensible", async ({ page }) => {
  await scriptsApi(page, { empty: true });
  await page.goto("/scripts/editor");
  await expect(
    page.getByRole("heading", { name: "No projects yet" }),
  ).toBeVisible();
});
test("scripts are restricted to channel owners", async ({ page }) => {
  await mockApi(page, { role: "EDITOR" });
  await page.goto("/scripts/editor");
  await expect(page).toHaveURL(/\/channels$/);
});
