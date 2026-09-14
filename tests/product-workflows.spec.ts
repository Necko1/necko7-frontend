import { test, expect } from "@playwright/test";
import { mockApi, channel } from "./fixtures";
import { rewardErrors } from "../src/components/rewards/validateReward";

test("reward validation covers every type and restrictions before submission", () => {
  const base = {
    reward_type: "FIXED" as const,
    market_item_name: "AK-47",
    twitch_title: "Drop",
    pricing_mode: "MANUAL" as const,
    manual_twitch_points: 100,
  };
  expect(rewardErrors(base, "all")).toEqual([]);
  expect(rewardErrors({ ...base, manual_twitch_points: 0 }, "all")).toContain(
    "points",
  );
  expect(
    rewardErrors(
      {
        ...base,
        reward_type: "FILTER",
        filter_config: { min_price: 20, max_price: 10 },
      },
      "items",
    ),
  ).toContain("filter");
  expect(
    rewardErrors(
      {
        ...base,
        reward_type: "POOL",
        pool_items: [
          {
            market_hash_name: "AK",
            weight: 0,
            permissible_market_price_deviation: 10,
          },
        ],
      },
      "items",
    ),
  ).toContain("pool");
  expect(
    rewardErrors(
      {
        ...base,
        purchase_limits: { user: [{ max_redemptions: 1, window_hours: 0 }] },
      },
      "all",
    ),
  ).toContain("limits");
  expect(
    rewardErrors({ ...base, global_cooldown_seconds: -1 }, "all"),
  ).toContain("limits");
});

for (const width of [1440, 390]) {
  test(`reward builder validates, restores drafts and reviews before publish at ${width}px`, async ({
    page,
  }) => {
    const mutations = await mockApi(page);
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/rewards");
    await page.getByRole("button", { name: "New Reward", exact: true }).click();
    await page
      .getByRole("button", { name: "Configure reward", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Choose a market item");
    expect(mutations).toHaveLength(0);
    await page
      .locator("#market_item_name")
      .fill("AK-47 | Redline (Field-Tested)");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "New Reward", exact: true }).click();
    await expect(page.locator("#market_item_name")).toHaveValue(
      "AK-47 | Redline (Field-Tested)",
    );
    await page
      .getByRole("button", { name: "Configure reward", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review reward", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Enter a reward title");
    await page.locator("#twitch_title").fill("QA drop");
    await page
      .getByRole("navigation", { name: "Configure behavior sections" })
      .getByRole("button", { name: /Viewer eligibility/ })
      .click();
    await page
      .getByRole("switch", { name: "Require chat activity", exact: true })
      .check();
    await page.locator("#chat_min_messages").fill("5");
    await page.getByRole("dialog").screenshot({
      path: `test-results/product/${width}-configure.png`,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Review reward", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("QA drop");
    await expect(page.getByRole("dialog")).toContainText("5 messages");
    expect(mutations).toHaveLength(0);
    await page.getByRole("dialog").screenshot({
      path: `test-results/product/${width}-review.png`,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Create Reward", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(mutations).toHaveLength(1);
    expect(mutations[0].body).toMatchObject({
      twitch_title: "QA drop",
      chat_min_messages: 5,
      reward_type: "FIXED",
    });
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("reward-draft:v2:123:123:new"),
      ),
    ).toBeNull();
  });

  test(`operator case, eligibility and viewer histories at ${width}px`, async ({
    page,
  }) => {
    await mockApi(page);
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/chat/users/900");
    await page
      .getByRole("button", { name: "1 need review", exact: true })
      .click();
    await expect(page.locator(".ledger-summary")).toHaveCount(1);
    await page.locator(".ledger-summary").click();
    const caseView = page.locator(".redemption-case");
    await expect(caseView).toContainText(
      "Purchase held: insufficient market balance",
    );
    await expect(caseView).not.toContainText("Trade completed for marshmallow");
    await expect(caseView).toContainText(
      "This does not reverse a market purchase",
    );
    await caseView.screenshot({
      path: `test-results/product/${width}-case.png`,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Eligibility & limits", exact: true })
      .click();
    await expect(page.locator(".limit-list")).toContainText("0 left");
    await page.screenshot({
      path: `test-results/product/${width}-eligibility.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/me");
    await page.locator(".viewer-history-row summary").first().click();
    await expect(page.locator(".viewer-history-detail").first()).toContainText(
      "Reference for the channel team",
    );
    await page.screenshot({
      path: `test-results/product/${width}-global.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.goto("/c/necko/profile");
    await expect(page.locator(".limit-list")).toContainText("0 left");
    await page.screenshot({
      path: `test-results/product/${width}-channel.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("editing a reward sends only changed fields", async ({ page }) => {
  const mutations = await mockApi(page);
  await page.goto("/rewards");
  await page.getByRole("button", { name: "Redline drop", exact: true }).click();
  await page.getByRole("tab", { name: "Edit Reward", exact: true }).click();
  await page.locator("#twitch_title").fill("Updated reward title");
  await page
    .getByRole("button", { name: "Review reward", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => mutations.length).toBe(1);
  expect(mutations[0].body).toEqual({ twitch_title: "Updated reward title" });
});

test("chat filters survive navigation and old pages pause live updates", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/chat/messages?**", (route) => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get("offset") || 0);
    return route.fulfill({
      json: {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: offset + i,
          message_id: `msg-${offset + i}`,
          broadcaster_id: "123",
          chatter_user_id: "900",
          chatter_user_login: "pixelpilot",
          message_text: `Message ${offset + i}: ${i === 2 ? "https://steamcommunity.com/ " + "Long text ".repeat(30) : "Thanks for the reward!"}`,
          sent_at: new Date(
            Date.UTC(2026, 8, 13, 12, 0) - (offset + i) * 30000,
          ).toISOString(),
        })),
        total: 120,
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 960 });
  await page.goto("/chat");
  await page.getByLabel("Message text", { exact: true }).fill("reward");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=reward/);
  await page.getByLabel("Follow latest", { exact: true }).check();
  await page.getByRole("button", { name: "Older", exact: true }).click();
  await expect(
    page.getByText(
      "Paused while reading older messages. Resumes on the latest page.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".message-stream")).toContainText("Message 50");
  await page.reload();
  await expect(page.locator(".message-stream")).toContainText("Message 50");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/product/390-chat-history.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("workspace groups separate roles and inspect setup without switching", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/v1/broadcasters", (route) =>
    route.fulfill({
      json: [
        channel,
        {
          ...channel,
          channel_id: "456",
          channel_login: "editor_channel",
          display_name: "Editor channel",
          role: "EDITOR",
        },
        {
          ...channel,
          channel_id: "789",
          channel_login: "community",
          display_name: "Community",
          role: "VIEWER",
        },
      ],
    }),
  );
  await page.setViewportSize({ width: 390, height: 960 });
  await page.goto("/channels");
  await expect(
    page.getByRole("heading", { name: "Channels you operate", exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Setup & attention", exact: true })
    .first()
    .click();
  await expect(page.locator(".workspace-inspect")).toContainText(
    "Market key stored",
  );
  await expect(page).toHaveURL(/\/channels$/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/product/390-workspaces.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByLabel("Find a channel", { exact: true }).fill("community");
  await expect(page.locator(".workspace-row")).toHaveCount(1);
});

test("analysis uses a shared period, correct server sort, and keyboard chart inspection", async ({
  page,
}) => {
  await mockApi(page);
  const requests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/chat/leaderboard")) requests.push(req.url());
  });
  await page.goto("/leaderboard");
  await page
    .getByRole("navigation", { name: "Analysis period" })
    .getByRole("button", { name: "24h", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Rank by", exact: true })
    .getByRole("button", { name: "Characters", exact: true })
    .click();
  await expect
    .poll(() =>
      requests.some(
        (url) =>
          url.includes("sort_by=characters") &&
          url.includes("time_window_hours=24"),
      ),
    )
    .toBe(true);
  await page.locator(".activity-bars button").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".activity-bars button").nth(1)).toBeFocused();
  await page.screenshot({
    path: "test-results/product/1440-analysis.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("a rejected reward save preserves the draft and allows correction", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/api/v1/broadcasters/123/rewards", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          json: { error: { message: "Market unavailable" } },
        })
      : route.fallback(),
  );
  await page.goto("/rewards");
  await page.getByRole("button", { name: "New Reward", exact: true }).click();
  await page
    .locator("#market_item_name")
    .fill("AK-47 | Redline (Field-Tested)");
  await page
    .getByRole("button", { name: "Configure reward", exact: true })
    .click();
  await page.locator("#twitch_title").fill("Keep my draft");
  await page
    .getByRole("button", { name: "Review reward", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create Reward", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Market unavailable");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New Reward", exact: true }).click();
  await page
    .getByRole("button", { name: "Configure reward", exact: true })
    .click();
  await expect(page.locator("#twitch_title")).toHaveValue("Keep my draft");
});

test("browser back restores the applied chat search inputs", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/chat");
  await page.getByLabel("Message text", { exact: true }).fill("first");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByText("Matching: “first”", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Message text", { exact: true }).fill("second");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=second/);
  await expect(
    page.getByText("Matching: “second”", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/q=first/);
  await expect(
    page.getByText("Matching: “first”", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Message text", { exact: true })).toHaveValue(
    "first",
  );
});
