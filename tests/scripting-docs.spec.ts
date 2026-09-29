import { test, expect, type Page } from "@playwright/test";

const root = "http://127.0.0.1:4174/docs/scripting/";
const capture = (page: Page, name: string) => page.screenshot({ path: `../.qa/productization/docs-${name}.png`, animations: "disabled" });

test("documentation navigation, reference and long result shapes", async ({ page }) => {
  await page.goto(root);
  await expect(page.locator("main h1")).toContainText("necko7 scripting");
  await capture(page, "home");
  await page.getByRole("switch", { name: "Switch to dark theme" }).click();
  await capture(page, "home-dark");
  await page.goto(`${root}reference/`);
  await expect(page.locator("main h1")).toContainText("API reference");
  await capture(page, "reference");
  await page.goto(`${root}reference/rewards`);
  await expect(page.locator("#trigger")).toBeVisible();
  await expect(page.locator("main")).toContainText("rewards.trigger(alias: string, user_id: string)");
  await expect(page.locator("main")).toContainText("is_paused");
  await capture(page, "rewards");
  await page.goto(`${root}reference/data#result`);
  await expect(page.locator("#result")).toBeInViewport();
  await capture(page, "data-long");
});

test("complete ace recipe and searchable API", async ({ page }) => {
  await page.goto(`${root}cookbook/ace-secret-case`);
  await expect(page.locator("main")).toContainText("Duration::from_mins(2)");
  await expect(page.locator("main")).toContainText("RewardFilter::create()");
  await capture(page, "ace-recipe");
  await page.getByRole("button", { name: /Search/ }).click();
  await page.getByRole("searchbox").fill("recent_chatters");
  await expect(page.locator(".VPLocalSearchBox .results")).toContainText("recent_chatters");
  await capture(page, "search");
  await page.keyboard.press("Escape");
  await expect(page.locator(".VPLocalSearchBox")).toHaveCount(0);
});

test("documentation narrow/light view and real deep links stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${root}reference/rewards#trigger`);
  await expect(page.locator("#trigger")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, "narrow");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("link", { name: "Getting started", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Getting started", exact: true }).click();
  await expect(page).toHaveURL(/getting-started$/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${root}language`);
  await page.getByRole("switch").click();
  await capture(page, "language-light");
  await expect(page.getByRole("link", { name: "The Rhai Book", exact: true })).toHaveAttribute("href", "https://rhai.rs/book/");
});
