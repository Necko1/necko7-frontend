import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";

const longName = `AK-47 | ${"Unbroken".repeat(28)} (Field-Tested)`;
const item = (status: string, index: number) => ({
  id: `550e8400-e29b-41d4-a716-4466554400${String(index).padStart(2, "0")}`,
  redemption_id: `a1b2c3d4-e5f6-7890-abcd-ef12345678${String(index).padStart(2, "0")}`,
  viewer_id: "123", item_name: index ? longName : "AK-47 | Redline (Field-Tested)",
  fixed_price: 2750, currency: "USD", market_order_id: index ? null : "11392691554",
  lifecycle_status: status, fulfillment_mode: "AUTO", buyer_retry_allowed: false,
  market_custom_id: index ? null : "a1b2c3d4-e5f6-7890-abcd-ef1234567800",
  latest_attempt_custom_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567800",
  latest_attempt_max_price: 2750, latest_attempt_status: status === "DELIVERED" ? "DELIVERED" : "REJECTED", latest_attempt_outcome_kind: status === "INSUFFICIENT_FUNDS" ? "no_money" : null, attempt_count: 1,
  created_at: "2026-09-20T12:00:00Z", acquired_at: status === "DELIVERED" ? "2026-09-20T12:05:00Z" : null,
  channel_id: "123", channel_login: "necko", reward_title: "Redline drop",
  redemption_status: status === "DELIVERED" ? "COMPLETED" : "PENDING", fail_cause: status === "INSUFFICIENT_FUNDS" ? "no_money" : null,
  fail_description: status === "INSUFFICIENT_FUNDS" ? "Market could not find the item" : null,
});

for (const width of [1440, 390]) test(`inventory renders at ${width}px`, async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/v1/users/me/settings", route => route.fulfill({ json: { viewer_id: "123", auto_buy_enabled: true, trade_link: null, updated_at: "2026-09-20T12:00:00Z" } }));
  await page.setViewportSize({ width, height: 900 });
  await page.route("**/api/v1/me/inventory**", route => route.fulfill({ json: [item("DELIVERED", 0), item("INSUFFICIENT_FUNDS", 1)] }));
  await page.route("https://cdn2.csgo.com/item/**", route => route.abort());
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await expect(page.locator(".inventory-item")).toHaveCount(2);
  await expect(page.getByText("$2.75").first()).toBeVisible();
  await expect(page.getByText("Market could not find the item")).toBeVisible();
  await expect(page.locator(".inventory-item").last().locator("h3")).toHaveText(longName);
  await expect(page.locator(".inventory-item").first().locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  await page.screenshot({ path: `test-results/inventory/${width}-items.png`, fullPage: true });
});

test("empty viewer inventory and channel scoped operator inventory", async ({ page }) => {
  await mockApi(page);
  const operatorQueries: URL[] = [];
  await page.route("**/api/v1/users/me/settings", route => route.fulfill({ json: { viewer_id: "123", auto_buy_enabled: true, trade_link: null, updated_at: "2026-09-20T12:00:00Z" } }));
  await page.route("**/api/v1/me/inventory**", route => route.fulfill({ json: [] }));
  await page.route("**/api/v1/broadcasters/123/chat/users/900/inventory**", route => {
    operatorQueries.push(new URL(route.request().url()));
    return route.fulfill({ json: [{ ...item("ORDER_PENDING", 0), latest_attempt_max_price: 3500, attempt_count: 2 }] });
  });
  await page.goto("/inventory");
  await expect(page.getByText("No matching inventory items")).toBeVisible();
  await page.screenshot({ path: "test-results/inventory/empty-desktop.png", fullPage: true });
  await page.goto("/chat/users/900?view=inventory");
  await expect(page.locator(".inventory-item")).toHaveCount(1);
  await expect(page.locator(".inventory-item .eyebrow")).toHaveText("Market order in progress");
  await page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Market order in progress" }).click();
  await expect.poll(() => operatorQueries.at(-1)?.searchParams.get("status")).toBe("ORDER_PENDING");
  await page.getByText("Market references").click();
  await expect(page.getByText("11392691554")).toBeVisible();
  await expect(page.getByText("$2.75")).toBeVisible();
  await expect(page.getByText("$3.50")).toBeVisible();
  await page.screenshot({ path: "test-results/inventory/operator-desktop.png", fullPage: true });
});

test("viewer settings and explicit inventory actions keep unsafe states read only", async ({ page }) => {
  const mutations = await mockApi(page);
  const cards = [
    { ...item("WAITING_VIEWER", 0), market_order_id: null, market_custom_id: null, attempt_count: 0, latest_attempt_status: null },
    { ...item("TRADE_LINK_REQUIRED", 1), latest_attempt_outcome_kind: "trade_link" },
    { ...item("RECONCILIATION_REQUIRED", 2), latest_attempt_status: "RECONCILIATION_REQUIRED" },
    { ...item("TRADE_WAITING", 3), latest_attempt_status: "TRADE_WAITING" },
    { ...item("WAITING_OPERATOR", 4), fulfillment_mode: "OPERATOR" },
    { ...item("DELIVERED", 5), fulfillment_mode: "LEGACY_REVIEW" },
  ];
  await page.route("**/api/v1/me/inventory**", route => route.request().method() === "GET" ? route.fulfill({ json: cards }) : route.fallback());
  await page.goto("/inventory");
  await expect(page.getByText("Trade link required").last()).toBeVisible();
  await page.screenshot({ path: "test-results/inventory/actions-desktop.png", fullPage: true });
  await expect(page.locator(".inventory-item").nth(2).getByRole("button")).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(3).getByRole("button")).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(4).getByRole("button", { name: "Start delivery" })).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(5).getByText("historical recorded value")).toBeVisible();
  await expect(page.locator(".inventory-item").nth(5).getByRole("button")).toHaveCount(0);
  await page.getByPlaceholder("https://steamcommunity.com/tradeoffer/new/?partner=…&token=…").fill("https://steamcommunity.com/tradeoffer/new/?partner=22&token=xyz");
  await page.getByRole("button", { name: "Save delivery settings" }).click();
  await expect.poll(() => mutations.some(m => m.path === "/api/v1/users/me/settings" && (m.body as { trade_link: string }).trade_link?.includes("partner=22"))).toBe(true);
  await expect(page.locator(".inventory-item").nth(1).getByRole("button", { name: "Try saved trade link" })).toBeVisible();
  await page.locator(".inventory-item").nth(1).getByRole("button", { name: "Try saved trade link" }).click();
  await page.getByRole("button", { name: "Start order", exact: true }).click();
  await expect.poll(() => mutations.some(m => m.path.endsWith("/attempt"))).toBe(true);
});

test("global filters and channel inventory use one inventory source", async ({ page }) => {
  await mockApi(page);
  const inventoryQueries: URL[] = [];
  await page.route("**/api/v1/me/inventory**", route => {
    const url = new URL(route.request().url());
    inventoryQueries.push(url);
    const filtered = url.searchParams.get("status") === "DELIVERED" && url.searchParams.get("search") === "Redline";
    return route.fulfill({ json: filtered ? [item("DELIVERED", 0)] : [] });
  });
  await page.route("**/api/v1/broadcasters/123/me/inventory**", route => route.fulfill({ json: [item("WAITING_OPERATOR", 0)] }));
  await page.goto("/inventory");
  const globalStatus = page.getByRole("group", { name: "Status" });
  await expect(globalStatus.getByRole("button", { name: "All statuses" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('section[aria-label="Inventory items"] select')).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Channel" })).toHaveCount(0);
  await globalStatus.getByRole("button", { name: "Delivered", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(globalStatus.getByRole("button", { name: "Delivered", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByPlaceholder("Item name").fill("Redline");
  await expect(page.locator(".inventory-item")).toHaveCount(1);
  expect(inventoryQueries.every(url => !url.searchParams.has("channel"))).toBe(true);
  expect(inventoryQueries.at(-1)?.searchParams.get("status")).toBe("DELIVERED");
  await page.goto("/c/necko/profile");
  await expect(page.getByRole("heading", { name: "Inventory on this channel" })).toBeVisible();
  const channelStatus = page.getByRole("group", { name: "Status" });
  await channelStatus.getByRole("button", { name: "Operator review" }).click();
  await expect(channelStatus.getByRole("button", { name: "Operator review" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".inventory-item")).toHaveCount(1);
  await page.screenshot({ path: "test-results/inventory/channel-desktop.png", fullPage: true });
});

test("inventory actions and channel view fit mobile", async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/users/me/settings", route => route.fulfill({ json: { viewer_id: "123", auto_buy_enabled: false, trade_link: null, updated_at: "2026-09-20T12:00:00Z" } }));
  await page.route("**/api/v1/me/inventory**", route => route.fulfill({ json: [item("RETRY_AVAILABLE", 0), item("TRADE_LINK_REQUIRED", 1), { ...item("WAITING_OPERATOR", 2), fulfillment_mode: "OPERATOR" }] }));
  await page.route("**/api/v1/broadcasters/123/me/inventory**", route => route.fulfill({ json: [item("DELIVERED", 0)] }));
  await page.route("**/api/v1/broadcasters/123/chat/users/900/inventory**", route => route.fulfill({ json: [item("ORDER_PENDING", 0)] }));
  await page.goto("/inventory");
  await expect(page.locator(".inventory-item")).toHaveCount(3);
  await expect(page.locator(".inventory-item").nth(2).getByRole("button", { name: "Try delivery again" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({ path: "test-results/inventory/actions-mobile.png", fullPage: true });
  await page.goto("/c/necko/profile");
  await expect(page.locator(".inventory-item")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({ path: "test-results/inventory/channel-mobile.png", fullPage: true });
  await page.goto("/chat/users/900?view=inventory");
  await expect(page.getByRole("group", { name: "Status" }).getByRole("button", { name: "All statuses" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  await page.screenshot({ path: "test-results/inventory/operator-mobile.png", fullPage: true });
});

for (const width of [1440, 390]) test(`durable Market transaction states at ${width}px`, async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width, height: 900 });
  const cards = [
    { ...item("ORDER_PENDING", 0), latest_attempt_status: "ORDER_CREATED", latest_market_stage: "1" },
    { ...item("TRADE_WAITING", 1), latest_attempt_status: "TRADE_WAITING", latest_market_stage: "1", latest_trade_id: "trade-123", latest_receive_until: "2026-09-23T12:00:00Z" },
    { ...item("TRADE_ACCEPTED", 2), latest_attempt_status: "TRADE_ACCEPTED", latest_market_stage: "1", latest_settlement: "2026-09-23T12:01:00Z" },
    { ...item("RETRY_AVAILABLE", 3), latest_attempt_status: "SELLER_FAILED", latest_attempt_outcome_kind: "seller_reverted", latest_market_stage: "5", latest_market_refund: { seller: { amount: 1.25, currency: "RUB" } } },
    { ...item("RETRY_AVAILABLE", 4), latest_attempt_status: "BUYER_FAILED", latest_attempt_outcome_kind: "buyer_reverted", latest_market_stage: "5", buyer_retry_allowed: true },
    { ...item("OPERATOR_REVIEW", 5), latest_attempt_status: "TERMINAL_UNCLASSIFIED", latest_attempt_outcome_kind: "terminal_unclassified", latest_market_stage: "5" },
    { ...item("DELIVERED", 6), latest_attempt_status: "DELIVERED", latest_market_stage: "2" },
    { ...item("OPERATOR_REVIEW", 7), latest_attempt_status: "TERMINAL_UNCLASSIFIED", latest_attempt_outcome_kind: "terminal_unclassified", latest_market_stage: "5", redemption_status: "COMPLETED" },
    { ...item("RETRY_AVAILABLE", 8), latest_attempt_status: "SELLER_FAILED", latest_attempt_outcome_kind: "seller_not_sent", latest_market_stage: "5", buyer_retry_allowed: true },
  ];
  await page.route("**/api/v1/me/inventory**", route => route.fulfill({ json: cards }));
  await page.route("**/api/v1/broadcasters/123/chat/users/900/inventory**", route => route.fulfill({ json: cards }));
  await page.goto("/inventory");
  await expect(page.locator(".inventory-item").nth(2).locator(".eyebrow")).toHaveText("Accepted, awaiting final Market confirmation");
  await expect(page.getByText("Seller reverted the accepted trade")).toBeVisible();
  await expect(page.getByText("You reverted the accepted trade")).toBeVisible();
  await expect(page.locator(".inventory-item").nth(2).getByRole("button", { name: "Try delivery again" })).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(3).getByRole("button", { name: "Try delivery again" })).toBeVisible();
  await expect(page.locator(".inventory-item").nth(4).getByRole("button", { name: "Try delivery again" })).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(4).getByRole("button", { name: "Return Channel Points" })).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(4).getByText("You cannot retry delivery or return Channel Points after reverting an accepted trade.", { exact: false })).toBeVisible();
  await expect(page.locator(".inventory-item").nth(5).getByRole("button", { name: "Try delivery again" })).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(5).getByRole("button", { name: "Return Channel Points" })).toBeVisible();
  await expect(page.locator(".inventory-item").nth(5).getByText("Market confirmed that this attempt ended", { exact: false })).toBeVisible();
  await expect(page.locator(".inventory-item").nth(7).getByRole("button")).toHaveCount(0);
  await expect(page.locator(".inventory-item").nth(7).getByText("This redemption is already marked completed", { exact: false })).toBeVisible();
  await expect(page.locator(".inventory-item").nth(8).getByRole("button", { name: "Try delivery again" })).toBeVisible();
  await expect(page.locator(".inventory-item").nth(8).getByRole("button", { name: "Return Channel Points" })).toBeVisible();
  await expect(page.locator(".inventory-item").nth(8).getByText("reverting an accepted trade", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  await page.screenshot({ path: `test-results/inventory/${width}-trade-states.png`, fullPage: true });
  await page.goto("/chat/users/900?view=inventory");
  await page.locator(".inventory-item").nth(3).getByText("Market references").click();
  await expect(page.getByText('"amount":1.25')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
});
