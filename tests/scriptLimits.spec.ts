import { test, expect } from "@playwright/test";
import { scriptsApi } from "./scriptFixtures";

for (const role of ["OWNER", "EDITOR"] as const) {
  test(`${role} configures project timeouts independently of source publication`, async ({ page }) => {
    const fixture = await scriptsApi(page, { role });
    await page.goto("/scripts/editor");
    await page.getByRole("button", { name: "Project actions" }).click();
    await page.getByRole("menuitem", { name: "Execution limits", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Execution limits", exact: true });
    const total = dialog.getByRole("spinbutton", { name: "Maximum execution time (seconds)", exact: true });
    const host = dialog.getByRole("spinbutton", { name: "Maximum time per external call (seconds)", exact: true });
    await expect(total).toHaveValue("30");
    await expect(host).toHaveValue("10");
    await total.fill("45");
    await host.fill("20");
    await dialog.getByRole("button", { name: "Save limits" }).click();
    await expect(dialog).not.toBeVisible();
    expect(fixture.actions).toContainEqual({ action: "execution_limits", project_id: "p", execution_timeout_secs: 45, host_timeout_secs: 20 });
    expect(fixture.data.projects[0].draft_version).toBe(5);
    expect(fixture.data.projects[0].active_revision).toBe(2);
    await page.reload();
    await page.getByRole("button", { name: "Project actions" }).click();
    await page.getByRole("menuitem", { name: "Execution limits", exact: true }).click();
    await expect(total).toHaveValue("45");
    await expect(host).toHaveValue("20");
    await page.screenshot({ path: `../.qa/script-limits/${role.toLowerCase()}-settings.png`, animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Project actions" })).toBeFocused();
  });
}

test("invalid limits do not submit and a server error preserves editable values", async ({ page }) => {
  const fixture = await scriptsApi(page);
  let rejected = false;
  await page.route("**/api/v1/broadcasters/123/scripts", async route => {
    if (route.request().method() === "POST" && route.request().postDataJSON().action === "execution_limits" && !rejected) {
      rejected = true;
      return route.fulfill({ status: 400, json: { message: "Host timeout cannot exceed the execution timeout" } });
    }
    return route.fallback();
  });
  await page.goto("/scripts/editor");
  await page.getByRole("button", { name: "Project actions" }).click();
  await page.getByRole("menuitem", { name: "Execution limits", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const total = dialog.getByRole("spinbutton", { name: "Maximum execution time (seconds)", exact: true });
  const host = dialog.getByRole("spinbutton", { name: "Maximum time per external call (seconds)", exact: true });
  for (const value of ["0", "121", "1.5"]) {
    await total.fill(value);
    await dialog.getByRole("button", { name: "Save limits" }).click();
    await expect(dialog.getByRole("alert")).toContainText("whole number from 1 to 120");
  }
  await total.fill("5");
  await host.fill("6");
  await dialog.getByRole("button", { name: "Save limits" }).click();
  await expect(dialog.getByRole("alert")).toContainText("cannot exceed");
  expect(fixture.actions).toHaveLength(0);
  await host.fill("4");
  await dialog.getByRole("button", { name: "Save limits" }).click();
  await expect(dialog.getByRole("alert")).toContainText("cannot exceed");
  await expect(total).toHaveValue("5");
  await expect(host).toHaveValue("4");
  await dialog.getByRole("button", { name: "Save limits" }).click();
  await expect(dialog).not.toBeVisible();
  expect(fixture.actions.filter(a => a.action === "execution_limits")).toHaveLength(1);
});

test("Russian limits fit narrow widths and reports keep captured historical values", async ({ page }) => {
  const fixture = await scriptsApi(page, { role: "EDITOR" });
  Object.assign(fixture.data.executions[0].report, { meta: { execution_limits: { execution_timeout_secs: 30, host_timeout_secs: 10 } } });
  fixture.data.projects[0].execution_timeout_secs = 45;
  fixture.data.projects[0].host_timeout_secs = 20;
  await page.addInitScript(() => localStorage.setItem("necko_lang", "ru"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/scripts/editor");
  await page.getByRole("button", { name: "Действия с проектом" }).click();
  await page.getByRole("menuitem", { name: "Лимиты выполнения", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Лимиты выполнения", exact: true });
  await expect(dialog.getByRole("spinbutton", { name: "Максимальное время запуска (секунды)", exact: true })).toHaveValue("45");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "../.qa/script-limits/settings-narrow-ru.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await page.goto("/scripts/logs");
  await page.locator(".script-log-register article button").first().click();
  await expect(page.locator(".script-report")).toContainText("30 с на запуск · 10 с на внешний вызов");
  await page.screenshot({ path: "../.qa/script-limits/report-narrow-ru.png", animations: "disabled" });
});
