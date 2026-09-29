import { test, expect, type Page } from "@playwright/test";
import eventCatalog from "../docs/events.json" with { type: "json" };

const root = process.env.DOCS_TEST_URL || "http://127.0.0.1:4174/docs/scripting/";
const capture = (page: Page, name: string) => page.screenshot({ path: `../.qa/productization/docs-${name}.png`, animations: "disabled" });

test("message filtering guide, complete API and keyword recipe explain the same semantics", async ({ page }) => {
  await page.goto(`${root}message-filtering`);
  await expect(page.locator("main h1")).toContainText("Filter chatters by message content");
  await expect(page.locator("main")).toContainText("in that same message");
  await expect(page.locator("main")).toContainText("case_sensitive(false) is the default");
  await page.screenshot({ path: "../.qa/message-filter/docs-guide.png", animations: "disabled" });
  await page.goto(`${root}reference/MessageFilter`);
  for (const name of ["any", "all", "contains", "starts_with", "ends_with", "equals", "case_sensitive", "during"]) {
    await expect(page.locator(`main h2#${name}`)).toHaveCount(1);
  }
  await page.goto(`${root}reference/MessageFilter#case_sensitive`);
  await expect(page.locator("#case_sensitive")).toBeInViewport();
  await expect(page.locator("main")).toContainText("BEFORE and AFTER");
  await expect(page.locator("main")).toContainText("256 Unicode scalar values");
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#case_sensitive").evaluate(element => {
    window.scrollBy(0, element.getBoundingClientRect().top - 112);
  });
  await page.screenshot({ path: "../.qa/message-filter/docs-case-reference.png", animations: "disabled" });
  await page.goto(`${root}cookbook/message-keyword-draw`);
  await expect(page.locator("main")).toContainText("MessageFilter::any()");
  await expect(page.locator("main")).toContainText('contains("динозавр")');
  await expect(page.locator("main")).toContainText("case_sensitive(false)");
  await page.screenshot({ path: "../.qa/message-filter/docs-cookbook.png", animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${root}reference/MessageFilter#all`);
  await expect(page.locator("#all")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "../.qa/message-filter/docs-narrow.png", animations: "disabled" });
});

test("independent windows, all-history defaults and legacy migration are discoverable", async ({ page }) => {
  await page.goto(`${root}user-filtering`);
  await expect(page.locator("main h1")).toContainText("User filtering and independent windows");
  await expect(page.locator("main")).toContainText("The candidate window does not become a nested filter's window");
  await expect(page.locator("main")).toContainText("all retained history for this channel");
  await expect(page.locator("main")).toContainText("original candidate-window semantics");
  for (const text of ["Duration::from_mins(1)", "Duration::from_mins(30)", "Duration::from_mins(5)", "Duration::from_days(7)"]) {
    await expect(page.locator("main")).toContainText(text);
  }
  await page.screenshot({ path: "../.qa/filter-windows/docs-user-windows.png", animations: "disabled" });
  await page.getByRole("switch", { name: "Switch to dark theme" }).click();
  await page.screenshot({ path: "../.qa/filter-windows/docs-user-windows-dark.png", animations: "disabled" });
  await page.goto(`${root}reference/ActivityFilter`);
  for (const name of ["create", "min_messages", "min_characters", "during"]) {
    await expect(page.locator(`main h2#${name}`)).toHaveCount(1);
  }
  await expect(page.locator("main")).toContainText("no host-call admission");
  await page.goto(`${root}reference/ActivityFilter#during`);
  await expect(page.locator("#during")).toBeInViewport();
  await expect(page.locator("main")).toContainText("Omit .during(...)");
  await page.locator("#during").evaluate(element => window.scrollBy(0, element.getBoundingClientRect().top - 112));
  await page.screenshot({ path: "../.qa/filter-windows/docs-activity-during.png", animations: "disabled" });
  await page.goto(`${root}reference/MessageFilter#during`);
  await expect(page.locator("#during")).toBeInViewport();
  await expect(page.locator("main")).toContainText("never inherits the candidate window");
  await page.locator("#during").evaluate(element => window.scrollBy(0, element.getBoundingClientRect().top - 112));
  await page.screenshot({ path: "../.qa/filter-windows/docs-message-during.png", animations: "disabled" });
  await page.goto(`${root}cookbook/independent-filter-windows`);
  await expect(page.locator("main")).toContainText("ActivityFilter::create()");
  await expect(page.locator("main")).toContainText("case_sensitive(false)");
  await page.screenshot({ path: "../.qa/filter-windows/docs-window-recipe.png", animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${root}reference/ActivityFilter#min_characters`);
  await expect(page.locator("#min_characters")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "../.qa/filter-windows/docs-activity-narrow.png", animations: "disabled" });
  await page.goto(`${root}user-filtering`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "../.qa/filter-windows/docs-windows-narrow.png", animations: "disabled" });
});

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

test("all CS2 events have discoverable sections on one page, not a payload table", async ({ page }) => {
  await page.goto(root);
  await page.getByRole("switch", { name: "Switch to dark theme" }).click();
  await page.getByRole("link", { name: "CS2 events and payloads", exact: false }).first().click();
  await expect(page).toHaveURL(/reference\/events$/);
  await expect(page.locator("main h1")).toContainText("CS2 events and payloads");
  await expect(page.locator("main table")).toHaveCount(0);
  for (const event of eventCatalog.events) {
    await expect(page.locator(`main h2#${event.kind}`)).toHaveCount(1);
    const details = page.locator("main details").filter({ has: page.locator("summary", { hasText: `Full event payload for ${event.kind}` }) });
    await expect(details).toHaveCount(1);
    await details.locator("summary").click();
    const example = JSON.parse(await details.locator("pre code").innerText());
    expect(example).toEqual({ ...eventCatalog.envelope, ...event.envelope, ...event.payload });
    await details.locator("summary").click();
  }
  await page.goto(`${root}reference/events`);
  await capture(page, "events-overview");
  await page.locator("main").getByRole("link", { name: "player_kill", exact: true }).first().click();
  await expect(page).toHaveURL(/reference\/events#player_kill$/);
  await expect(page.locator("#player_kill")).toBeInViewport();
  const description = page.locator("#player_kill").locator("xpath=following-sibling::ul[1]");
  await expect(description).toContainText("current match, across all rounds so far");
  await expect(description).toContainText("total is 7");
  await capture(page, "events-player-kill");
  const full = page.locator("main details").filter({ hasText: "Full event payload for player_kill" });
  await full.locator("summary").click();
  await full.scrollIntoViewIfNeeded();
  await capture(page, "events-full-payload");
});

test("CS2 event search deep-links to the actual event section", async ({ page }) => {
  await page.goto(root);
  await page.getByRole("button", { name: /Search/ }).click();
  await page.getByRole("searchbox").fill("player_died");
  const result = page.locator(".VPLocalSearchBox .results a").filter({ hasText: "player_died" }).first();
  await expect(result).toBeVisible();
  await capture(page, "events-search");
  await result.click();
  await expect(page).toHaveURL(/reference\/events#player_died$/);
  await expect(page.locator("#player_died")).toBeInViewport();
  await expect(page.locator("main")).toContainText("death total for the current match");
});

test("event deep links and full payloads remain readable at narrow widths and in light mode", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${root}reference/events#player_kill`);
  await expect(page.locator("#player_kill")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, "events-narrow");
  const full = page.locator("main details").filter({ hasText: "Full event payload for player_kill" });
  await full.locator("summary").click();
  await full.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, "events-narrow-payload");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${root}reference/events#ammo_changed`);
  if (await page.locator("html").evaluate(element => element.classList.contains("dark"))) {
    await page.getByRole("switch", { name: "Switch to light theme" }).click();
  }
  await expect(page.locator("#ammo_changed")).toBeInViewport();
  await page.locator("#ammo_changed").evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 80));
  await capture(page, "events-ammo-light");
});
