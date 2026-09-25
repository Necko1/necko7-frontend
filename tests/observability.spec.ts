import { test, expect } from "@playwright/test";
import { mockApi, redemptions } from "./fixtures";

for (const width of [1440, 390]) {
  test(`owner sees persisted inventory milestones and factual history at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    const rows = [
      { ...redemptions[1], status: "ORDER_CREATED", inventory_lifecycle_status: "ORDER_PENDING", latest_attempt_status: "ORDER_CREATED", latest_attempt_outcome_kind: null },
      { ...redemptions[7], status: "ORDER_CREATED", inventory_lifecycle_status: "TRADE_WAITING", latest_attempt_status: "TRADE_WAITING", latest_attempt_outcome_kind: null },
      { ...redemptions[13], status: "ORDER_CREATED", inventory_lifecycle_status: "TRADE_ACCEPTED", latest_attempt_status: "TRADE_ACCEPTED", latest_attempt_outcome_kind: null },
      { ...redemptions[19], status: "PENDING", inventory_lifecycle_status: "RETRY_AVAILABLE", latest_attempt_status: "SELLER_FAILED", latest_attempt_outcome_kind: "seller_reverted" },
      { ...redemptions[25], status: "PENDING", inventory_lifecycle_status: "OPERATOR_REVIEW", latest_attempt_status: "TERMINAL_UNCLASSIFIED", latest_attempt_outcome_kind: "terminal_unclassified" },
      { ...redemptions[2], status: "COMPLETED", inventory_lifecycle_status: "DELIVERED", latest_attempt_status: "DELIVERED", latest_attempt_outcome_kind: null },
    ];
    await page.route("**/api/v1/broadcasters/123/redemptions?**", route => route.fulfill({ json: { items: rows, total: rows.length, offset: 0, limit: 25 } }));
    const redemptionId = rows[2].twitch_redemption_id;
    await page.route(`**/api/v1/broadcasters/123/redemptions/${redemptionId}/audit`, route => route.fulfill({ json: [
      { id: 1, event_key: "redeemed", redemption_id: redemptionId, inventory_id: null, attempt_custom_id: null, event_type: "reward_redeemed", actor_kind: "viewer", actor_user_id: "913", created_at: "2026-09-25T10:00:00Z" },
      { id: 2, event_key: "created", redemption_id: redemptionId, inventory_id: "inventory-1", attempt_custom_id: null, event_type: "inventory_created", actor_kind: "system", actor_user_id: null, created_at: "2026-09-25T10:00:01Z" },
      { id: 3, event_key: "requested", redemption_id: redemptionId, inventory_id: "inventory-1", attempt_custom_id: "attempt-1", event_type: "automatic_order_initiated", actor_kind: "system", actor_user_id: null, created_at: "2026-09-25T10:00:02Z" },
      { id: 4, event_key: "order", redemption_id: redemptionId, inventory_id: "inventory-1", attempt_custom_id: "attempt-1", event_type: "market_order_created", actor_kind: "system", actor_user_id: null, created_at: "2026-09-25T10:00:03Z" },
      { id: 5, event_key: "trade", redemption_id: redemptionId, inventory_id: "inventory-1", attempt_custom_id: "attempt-1", event_type: "steam_trade_created", actor_kind: "system", actor_user_id: null, created_at: "2026-09-25T10:00:04Z" },
      { id: 6, event_key: "accepted", redemption_id: redemptionId, inventory_id: "inventory-1", attempt_custom_id: "attempt-1", event_type: "buyer_accepted_trade", actor_kind: "system", actor_user_id: null, created_at: "2026-09-25T10:00:05Z" },
    ] }));
    await page.goto("/redemptions");
    const summaries = page.locator(".ledger-summary");
    await expect(summaries).toHaveCount(6);
    await expect(summaries.nth(0)).toContainText("Market order in progress");
    await expect(summaries.nth(1)).toContainText("Steam trade waiting");
    await expect(summaries.nth(2)).toContainText("Accepted, awaiting final Market confirmation");
    await expect(summaries.nth(3)).toContainText("Seller reverted the accepted trade");
    await expect(summaries.nth(4)).toContainText("Trade ended; operator review needed");
    await expect(summaries.nth(5)).toContainText("Delivered");
    await summaries.nth(2).click();
    const timeline = page.locator(".case-timeline");
    await expect(timeline.locator("li")).toHaveCount(6);
    await expect(timeline).toContainText("Viewer redeemed the reward");
    await expect(timeline).toContainText("Buyer accepted; awaiting final Market confirmation");
    await expect(timeline).not.toContainText("Market confirmed delivery");
    await page.screenshot({ path: `test-results/observability-${width}.png`, fullPage: true });
  });
}
