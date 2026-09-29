import { test, expect, type Page } from "@playwright/test";
import { scriptsApi } from "./scriptFixtures";

const shot = (page: Page, name: string) => page.screenshot({ path: `../.qa/productization/${name}.png`, animations: "disabled" });
const menu = (page: Page) => page.getByRole("menu", { name: "File tree actions" });
const row = (page: Page, path: string) => page.locator(`.script-tree-node[data-path="${path}"]`);

test("pairing check is meaningful, preserves code and detects success", async ({ page }) => {
  await scriptsApi(page);
  let codes = 0, checks = 0, paired = false;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) {
      codes++;
      return route.fulfill({ json: { code: "ABCD-2345", expires_at: new Date(Date.now() + 300000).toISOString() } });
    }
    checks++;
    return route.fulfill({ json: { device: paired ? { id: "desktop", app_version: "qa", last_seen_at: null, last_heartbeat_at: new Date().toISOString() } : null } });
  });
  await page.goto("/scripts/cs2");
  await expect(page.getByText("ABCD-2345", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
  await shot(page, "pairing-desktop");
  const before = checks;
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect.poll(() => checks).toBeGreaterThan(before);
  await expect(page.getByRole("status")).toContainText("No desktop connected yet");
  expect(codes).toBe(1);
  await page.evaluate(() => document.addEventListener("click", event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="necko7-cs2i:"]');
    if (link) { event.preventDefault(); (window as any).qaDeepLink = link.href; }
  }, true));
  await page.getByRole("link", { name: "Open CS2 Integration", exact: true }).click();
  expect(await page.evaluate(() => (window as any).qaDeepLink)).toBe("necko7-cs2i://pair?code=ABCD-2345");
  await expect(page.getByText(/If nothing opens/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "pairing-narrow-open-feedback");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  paired = true;
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByRole("heading", { name: "Paired", exact: true })).toBeVisible();
  await expect(page.getByText("ABCD-2345", { exact: true })).toHaveCount(0);
});

test("file menu renames and moves with existing draft validation", async ({ page }) => {
  const { data } = await scriptsApi(page);
  await page.goto("/scripts/editor");
  await expect(row(page, "main.rhai")).toBeVisible();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await shot(page, "tree-normal");
  await row(page, "helpers.rhai").click({ button: "right" });
  await expect(menu(page)).toBeVisible();
  await shot(page, "tree-file-menu");
  await menu(page).getByRole("menuitem", { name: "Rename", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill("tools.rhai");
  await page.getByRole("dialog").getByRole("button", { name: "Rename", exact: true }).click();
  await expect(row(page, "tools.rhai")).toBeVisible();
  await row(page, "tools.rhai").click({ button: "right" });
  await menu(page).getByRole("menuitem", { name: "Move to...", exact: true }).click();
  await page.getByLabel("Destination path").fill("events/tools.rhai");
  await page.getByRole("dialog").getByRole("button", { name: "Move", exact: true }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect.poll(() => data.projects[0].draft["events/tools.rhai"]).toBe("fn helper() {}");
});

test("folder/background menus create at correct paths and deletion confirms", async ({ page }) => {
  await scriptsApi(page); await page.goto("/scripts/editor");
  await row(page, "events").click({ button: "right" });
  await shot(page, "tree-folder-menu");
  await menu(page).getByRole("menuitem", { name: "New file", exact: true }).click();
  await expect(page.getByLabel("File path")).toHaveValue("events/");
  await page.getByLabel("File path").fill("events/new.rhai");
  await page.getByRole("dialog").getByRole("button", { name: "Create file", exact: true }).click();
  await expect(row(page, "events/new.rhai")).toBeVisible();
  await page.locator(".script-tree").click({ button: "right", position: { x: 120, y: 240 } });
  await shot(page, "tree-background-menu");
  await expect(menu(page).getByRole("menuitem", { name: "Rename", exact: true })).toHaveCount(0);
  await menu(page).getByRole("menuitem", { name: "New folder", exact: true }).click();
  await expect(page.getByLabel("Folder path")).toHaveValue("");
  await page.getByLabel("Folder path").fill("timers");
  await page.getByRole("dialog").getByRole("button", { name: "Create folder", exact: true }).click();
  await row(page, "events/new.rhai").click({ button: "right" });
  await menu(page).getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Delete file or folder?" })).toBeVisible();
  await expect(row(page, "events/new.rhai")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(row(page, "events/new.rhai")).toHaveCount(0);
  await expect(row(page, "timers")).toBeVisible();
});

test("protected entry, keyboard, outside/Escape close and section changes", async ({ page }) => {
  await scriptsApi(page); await page.goto("/scripts/editor");
  await row(page, "main.rhai").click({ button: "right" });
  for (const name of ["Rename", "Move to...", "Delete"]) await expect(menu(page).getByRole("menuitem", { name, exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape"); await expect(menu(page)).toBeHidden();
  await row(page, "helpers.rhai").click({ button: "right" });
  await page.keyboard.press("ArrowDown");
  await expect(menu(page).getByRole("menuitem", { name: "Open", exact: true })).toBeFocused();
  const heading = await page.locator("h1").boundingBox();
  await page.mouse.click(heading!.x + 8, heading!.y + 8); await expect(menu(page)).toBeHidden();
  await page.locator(".script-tree").focus(); await page.keyboard.press("Shift+F10"); await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await row(page, "helpers.rhai").click({ button: "right" });
  const matches = page.locator('nav[aria-label="Scripts"] a[href="/scripts/matches"]');
  const target = await matches.boundingBox();
  await page.mouse.click(target!.x + 8, target!.y + 8);
  await expect(menu(page)).toBeHidden();
  await matches.click();
  await expect(menu(page)).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/scripts/editor");
  await expect(row(page, "main.rhai")).toBeVisible();
  await shot(page, "tree-narrow");
  await row(page, "events").click({ button: "right" });
  await expect(menu(page)).toBeVisible();
  const bounds = await menu(page).boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  await shot(page, "tree-narrow-menu");
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
});

test("Editor uses Scripts without requesting pairing credentials or exposing authority controls", async ({ page }) => {
  const { actions } = await scriptsApi(page, { role: "EDITOR" });
  let reads = 0, mutations = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().method() !== "GET") mutations++; else reads++;
    return route.fulfill({ json: { device: null } });
  });
  await page.goto("/channels"); await page.getByRole("link", { name: "Scripts", exact: true }).click();
  await expect(page).toHaveURL(/\/scripts\/editor$/);
  await expect(page.getByRole("link", { name: /Scripting documentation/ })).toBeVisible();
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.getByLabel("Project name").fill("Editor automation");
  await page.getByRole("dialog").getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// Saved by Editor");
  await page.keyboard.press("Control+s");
  await expect.poll(() => actions.find(a => a.action === "save")?.files["main.rhai"]).toContain("Saved by Editor");
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: /Test draft/ }).click(); await page.getByRole("button", { name: "Run dry test" }).click();
  expect(actions.map(a => a.action)).toEqual(expect.arrayContaining(["create", "save", "validate", "publish", "test"]));
  for (const label of ["Local Storage", "Matches", "Scheduler", "Logs", "CS2 Integration"]) {
    await page.getByRole("navigation", { name: "Scripts", exact: true }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).not.toHaveURL(/\/channels$/);
  }
  await expect(page.getByText("Desktop pairing is managed by the channel owner.")).toBeVisible();
  await expect(page.getByLabel("Pairing code")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open CS2 Integration", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Unpair desktop" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download desktop app" })).toBeVisible();
  expect(reads).toBeGreaterThan(0); expect(mutations).toBe(0); await shot(page, "editor-integration-readonly");
});
