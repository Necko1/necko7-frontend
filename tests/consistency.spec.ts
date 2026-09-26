import { test, expect } from "@playwright/test";
import { mockApi, redemptions, rewards } from "./fixtures";
import { rewardErrors } from "../src/components/rewards/validateReward";

const states = [
  ["ORDER_PENDING", null, "Market order in progress"],
  ["TRADE_WAITING", null, "Steam trade waiting"],
  ["TRADE_ACCEPTED", null, "Accepted, awaiting final Market confirmation"],
  ["DELIVERED", null, "Delivered"],
  ["REFUNDED", null, "Channel Points returned"],
  ["RETRY_AVAILABLE", "seller_not_sent", "Seller did not send the trade"],
  ["RETRY_AVAILABLE", "buyer_not_accepted", "Trade was not accepted"],
  ["RETRY_AVAILABLE", "seller_cancelled", "Seller cancelled the trade"],
  ["RETRY_AVAILABLE", "seller_reverted", "Seller reverted the accepted trade"],
  ["RETRY_AVAILABLE", "buyer_reverted", "You reverted the accepted trade"],
  ["OPERATOR_REVIEW", "terminal_unclassified", "Trade ended; operator review needed"],
] as const;

for (const width of [1440, 390]) {
  test(`global and channel profile show inventory lifecycle at ${width}px`, async ({ page }) => {
    await mockApi(page);
    await page.setViewportSize({ width, height: 960 });
    const rows = states.map(([state, outcome], i) => ({ ...redemptions[i], status: "OrderCreated",
      reward_title: `Reward ${i}`, channel_id: "123", channel_login: "necko",
      inventory_lifecycle_status: state, latest_attempt_outcome_kind: outcome }));
    await page.route("**/api/v1/**/me/redemptions**", route => route.fulfill({ json: rows }));
    for (const [path, name] of [["/me", "global"], ["/c/necko/profile", "channel"]]) {
      await page.goto(path);
      const labels = page.locator(".history-status");
      await expect(labels).toHaveCount(states.length);
      for (let i = 0; i < states.length; i++) await expect(labels.nth(i)).toHaveText(states[i][2]);
      await page.locator(".viewer-history-row > summary").nth(2).click();
      await expect(page.locator(".viewer-history-row[open] .viewer-history-detail")).toContainText(states[2][2]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `test-results/consistency-${name}-${width}.png`, fullPage: true });
    }
  });

  test(`owner delivery action uses existing endpoint and backend eligibility at ${width}px`, async ({ page }) => {
    const mutations = await mockApi(page);
    await page.setViewportSize({ width, height: 960 });
    const rows = [
      { ...redemptions[0], status: "PENDING", retry_count: 0, fail_cause: null, fail_description: null, inventory_id: "item-ready", inventory_lifecycle_status: "WAITING_VIEWER", inventory_operator_can_attempt: true },
      { ...redemptions[1], status: "PENDING", inventory_id: "item-active", inventory_lifecycle_status: "ORDER_PENDING", inventory_operator_can_attempt: false },
      { ...redemptions[2], status: "PENDING", inventory_id: "item-review", inventory_lifecycle_status: "OPERATOR_REVIEW", inventory_operator_can_attempt: false },
    ];
    await page.route("**/api/v1/broadcasters/123/redemptions?**", route => route.fulfill({ json: { items: rows, total: 3, limit: 25, offset: 0 } }));
    await page.route(`**/api/v1/broadcasters/123/redemptions/${rows[0].twitch_redemption_id}/audit`, route => route.fulfill({ json: [
      { id: 1, event_key: "redeemed", redemption_id: rows[0].twitch_redemption_id, event_type: "reward_redeemed", actor_kind: "viewer", actor_user_id: "900", created_at: rows[0].created_at },
      { id: 2, event_key: "inventory", redemption_id: rows[0].twitch_redemption_id, event_type: "inventory_created", actor_kind: "system", created_at: rows[0].created_at },
    ] }));
    await page.goto("/redemptions");
    await page.locator(".ledger-summary").nth(0).click();
    await expect(page.getByRole("button", { name: "Start delivery", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/consistency-actions-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Start delivery", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("fixed price ceiling");
    await page.getByRole("dialog").getByRole("button", { name: "Start delivery", exact: true }).click();
    await expect.poll(() => mutations.length).toBe(1);
    expect(mutations[0].path).toBe(`/api/v1/broadcasters/123/redemptions/${rows[0].twitch_redemption_id}/retry`);
    await page.locator(".ledger-summary").nth(0).click();
    for (const index of [1, 2]) {
      await page.locator(".ledger-summary").nth(index).click();
      await expect(page.getByRole("button", { name: "Start delivery", exact: true })).toHaveCount(0);
      await page.locator(".ledger-summary").nth(index).click();
    }
  });
}

test("description validation keeps unchanged legacy data and matches Unicode character limit", () => {
  const base = { reward_type: "FIXED" as const, market_item_name: "AK-47", twitch_title: "Drop", pricing_mode: "MANUAL" as const, manual_twitch_points: 100 };
  const legacy = "x".repeat(250);
  expect(rewardErrors({ ...base, twitch_description: legacy }, "all", legacy)).toEqual([]);
  expect(rewardErrors({ ...base, twitch_description: legacy }, "all")).toContain("description");
  expect(rewardErrors({ ...base, twitch_description: "y".repeat(201) }, "all", legacy)).toContain("description");
  expect(rewardErrors({ ...base, twitch_description: "🎁".repeat(200) }, "all", legacy)).toEqual([]);
  expect(rewardErrors({ ...base, twitch_description: "🎁".repeat(201) }, "all", legacy)).toContain("description");
});

test("editing unrelated reward fields preserves long description without sending it", async ({ page }) => {
  const mutations = await mockApi(page);
  const legacy = "saved description ".repeat(15);
  await page.route("**/api/v1/broadcasters/123/rewards**", route => route.request().method() === "GET"
    ? route.fulfill({ json: [{ ...rewards[0], twitch_description: legacy }] }) : route.fallback());
  await page.goto("/rewards");
  await page.getByRole("button", { name: "Redline drop", exact: true }).click();
  await page.getByRole("tab", { name: "Edit Reward", exact: true }).click();
  await expect(page.locator("#twitch_description")).toHaveValue(legacy);
  await page.locator("#twitch_title").fill("Edited title");
  await page.getByRole("button", { name: "Review reward", exact: true }).click();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => mutations.length).toBe(1);
  expect(mutations[0].body).toMatchObject({ twitch_title: "Edited title" });
  expect(mutations[0].body).not.toHaveProperty("twitch_description");
});
