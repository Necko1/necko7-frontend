import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";

test("held purchase requires confirmation and invalidates the queue", async ({ page }) => {
  const mutations = await mockApi(page);
  await page.goto("/redemptions?status=MANUAL_HOLD");
  await page.locator(".ledger-summary").first().click();
  await page.getByRole("button", { name: /Retry Market Order/i }).click();
  await expect(page.getByRole("dialog")).toContainText("Check the market order history");
  expect(mutations).toHaveLength(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(mutations).toHaveLength(0);
  await page.getByRole("button", { name: "Close without refund", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Channel Points are not returned");
  await page.getByRole("dialog").getByRole("button", { name: "Close without refund", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(mutations).toHaveLength(1);
  expect(mutations[0].path).toMatch(/\/penalty$/);
});

test("filters reset pagination and network failures are not empty states", async ({ page }) => {
  await mockApi(page);
  await page.goto("/redemptions");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".ledger-summary")).toHaveCount(7);
  await page.getByRole("button", { name: "Manual Hold", exact: true }).click();
  await expect(page.locator(".ledger-summary")).toHaveCount(6);
  await page.route("**/api/v1/broadcasters/*/redemptions?**", route => route.fulfill({ status: 503, body: "{}" }));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText("Couldn’t load");
});

test("settings validate numeric ranges and save only changes", async ({ page }) => {
  const mutations = await mockApi(page);
  await page.goto("/broadcasters/123/settings");
  await page.locator("#update_prices_period").fill("1");
  await page.getByRole("button", { name: "Save Changes", exact: false }).click();
  expect(mutations).toHaveLength(0);
  await page.locator("#update_prices_period").fill("600");
  await page.getByRole("button", { name: "Save Changes", exact: false }).click();
  await expect(page.getByText("All changes saved", { exact: true })).toBeVisible();
  expect(mutations[0].body).toEqual({ update_prices_period: 600 });
});

test("Market errors keep their specific editable chat templates", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/v1/broadcasters/*/messages", route => route.fulfill({
    json: {
      channel_id: "123",
      messages: {
        orders: { unavailable: "@{buyer} {item} is unavailable at {price}." },
        market_errors: { inventory_hidden: "@{buyer} Open your Steam inventory for {item}. Your points remain pending." },
      },
      custom_messages: {},
      default_messages: {
        orders: { unavailable: "@{buyer} {item} is unavailable at {price}." },
        market_errors: { inventory_hidden: "@{buyer} Open your Steam inventory for {item}. Your points remain pending." },
      },
      placeholders: {
        orders: { unavailable: ["buyer", "item", "price"] },
        market_errors: { inventory_hidden: ["buyer", "item"] },
      },
    },
  }));
  await page.goto("/broadcasters/123/settings");
  await page.getByRole("tab", { name: "Chat Messages" }).click();
  await page.getByRole("button", { name: "Market Errors" }).click();
  await expect(page.getByText("Steam inventory is private")).toBeVisible();
  await expect(page.locator("#msg-input-market_errors-inventory_hidden")).toHaveValue(/points remain pending/);
  await page.getByRole("button", { name: "Orders" }).click();
  await expect(page.locator("#msg-input-orders-unavailable")).toHaveValue(/\{price\}/);
  await expect(page.getByTitle("Click to insert {price} at cursor")).toBeVisible();
});

test("editors can configure the bot but cannot manage access", async ({ page }) => {
  await mockApi(page, { role: "EDITOR" });
  await page.goto("/broadcasters/123/settings");
  await expect(page.locator("#market_api_key")).toBeVisible();
  await expect(page.getByRole("tab", { name: /Permissions|Access/i })).toHaveCount(0);
});

test("viewers are redirected away from operational actions", async ({ page }) => {
  await mockApi(page, { role: "VIEWER" });
  await page.goto("/redemptions?status=MANUAL_HOLD");
  await expect(page).toHaveURL(/\/c\/necko$/);
  await expect(page.getByText("Panel guide", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close without refund" })).toHaveCount(0);
});

test("guide auto-starts once, persists skipping, and can restart", async ({ page }) => {
  await mockApi(page, { tour: true });
  await page.goto("/dashboard");
  await expect(page.locator(".driver-popover-title")).toHaveText("A quick look around");
  await page.getByRole("button", { name: "Close guide" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("necko7:guide:v1:123:123:OWNER"))).toBe("skipped");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Operations overview" })).toBeVisible();
  await expect(page.locator(".driver-popover")).toHaveCount(0);
  await page.getByRole("button", { name: "Panel guide" }).click();
  await expect(page.locator(".driver-popover-title")).toHaveText("A quick look around");
});

for (const width of [1440, 1280, 768, 390]) {
  test(`responsive operational and community pages at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 960 });
    await mockApi(page);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const path of ["/dashboard", "/redemptions?status=MANUAL_HOLD", "/rewards", "/broadcasters/123/settings", "/logs", "/channels", "/chat", "/leaderboard", "/chat/users/900", "/c/necko", "/c/necko/profile", "/me"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(overflow.document, path).toBeLessThanOrEqual(overflow.viewport + 1);
      await page.screenshot({ path: `test-results/visual/${width}-${path.split("?")[0].replaceAll("/", "_")}.png`, fullPage: true, animations: "disabled" });
    }
    expect(errors).toEqual([]);
  });
}

for (const width of [1440, 390]) {
  test(`reward dialogs and editor guide at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    await mockApi(page, { role: "EDITOR" });
    await page.goto("/rewards");
    await page.getByRole("button", { name: "New Reward", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: `test-results/visual/${width}-create-reward.png`, fullPage: true, animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: "Redline drop", exact: true }).click();
    await expect(dialog).toBeVisible();
    const tabBounds = await dialog.getByRole("tablist").boundingBox();
    for (const tab of await dialog.getByRole("tab").all()) {
      const rect = await tab.boundingBox();
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(tabBounds!.y + tabBounds!.height + 1);
    }
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/visual/${width}-edit-reward.png`, fullPage: true, animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    if (width < 768) {
      await page.locator('[data-tour="mobile-header"] button').first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
    await page.getByRole("button", { name: "Panel guide", exact: true }).filter({ visible: true }).click();
    await expect(page.locator(".driver-popover-title")).toHaveText("A quick look around");
    for (let i = 0; i < 6; i++) {
      await page.locator(".driver-popover-next-btn").click();
      await expect(page.locator(".driver-popover-progress-text")).toContainText(String(i + 2));
    }
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("necko7:guide:v1:123:123:EDITOR"))).toBe("completed");
  });
}

test("Russian type and empty queue stay readable", async ({ page }) => {
  await mockApi(page, { empty: true });
  await page.addInitScript(() => localStorage.setItem("necko_lang", "ru"));
  await page.setViewportSize({ width: 390, height: 960 });
  await page.goto("/dashboard");
  await expect(page.locator("main h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/visual/390-russian-empty.png", fullPage: true, animations: "disabled" });
});
