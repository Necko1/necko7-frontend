import { test, expect, type Page } from "@playwright/test";
import { correctionApi, richRewards } from "./correction-fixtures";
async function capture(page: Page, name: string, width: number) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await expect(page.locator("main")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
    name,
  ).toBeLessThanOrEqual(width + 1);
  await page.screenshot({
    path: `test-results/corrections/${width}-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
for (const width of [1440, 390])
  test(`representative correction surfaces at ${width}px`, async ({ page }) => {
    test.setTimeout(180000);
    await correctionApi(page, { manyChannels: true });
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [path, name] of [
      ["/chat/users/900", "operator"],
      ["/me", "global-many"],
      ["/c/necko/profile", "channel"],
      ["/chat", "channel-chat"],
      ["/chat/users/900?view=chat", "viewer-chat"],
      ["/leaderboard", "analytics"],
      ["/logs", "logs"],
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible();
      if (name === "logs") await page.locator(".terminal-line").first().click();
      if (name === "global-many") {
        await expect(page.locator(".identity-avatar img")).toBeVisible();
        await page.locator(".viewer-history-row>summary").first().click();
      }
      await capture(page, name, width);
    }
    for (const i of [0, 2, 3]) {
      await page.goto(`/c/necko/rewards/${richRewards[i].twitch_id}`);
      await expect(page.locator(".reward-showcase")).toBeVisible();
      await capture(page, `public-${richRewards[i].reward_type}`, width);
    }
    await page.goto("/rewards");
    await page
      .getByRole("button", { name: "AWP surprise", exact: true })
      .click();
    await expect(page.locator(".effective-reward")).toBeAttached();
    await page.getByRole("dialog").screenshot({
      path: `test-results/corrections/${width}-reward-overview.png`,
    });
    await page.locator(".effective-reward").scrollIntoViewIfNeeded();
    await page.getByRole("dialog").screenshot({
      path: `test-results/corrections/${width}-configured-pool.png`,
    });
    await page.getByRole("tab", { name: "Edit Reward", exact: true }).click();
    await page.getByRole("dialog").screenshot({
      path: `test-results/corrections/${width}-behavior-viewer.png`,
    });
    for (const [label, name] of [
      ["Points & market", "pricing"],
      ["Viewer eligibility", "eligibility"],
      ["Usage limits", "limits"],
    ]) {
      await page
        .getByRole("navigation", { name: "Configure behavior sections" })
        .getByRole("button", { name: new RegExp(label) })
        .click();
      await page.getByRole("dialog").screenshot({
        path: `test-results/corrections/${width}-behavior-${name}.png`,
      });
    }
    await page.keyboard.press("Escape");
    await page.goto("/redemptions?status=MANUAL_HOLD");
    await page.locator(".ledger-summary").first().click();
    await expect(page.locator(".case-timeline")).toContainText(
      "Operator requested delivery",
    );
    await page
      .locator(".redemption-case")
      .screenshot({ path: `test-results/corrections/${width}-case.png` });
    expect(errors).toEqual([]);
  });
test("conversation grouping, keyboard author filter and explicit page direction", async ({
  page,
}) => {
  await correctionApi(page);
  await page.goto("/chat");
  await expect(page.locator(".conversation-line")).toHaveCount(50);
  await expect(page.locator(".conversation-line").nth(0)).toHaveAttribute(
    "data-continuation",
    "false",
  );
  await expect(page.locator(".conversation-line").nth(1)).toHaveAttribute(
    "data-continuation",
    "true",
  );
  await expect(page.locator(".conversation-line").nth(3)).toHaveAttribute(
    "data-continuation",
    "false",
  );
  await expect(page.getByText("Only this viewer", { exact: true })).toHaveCount(
    0,
  );
  const first = page.locator(".author-filter").first();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/chatter=pixelpilot/);
  await expect(page.getByLabel("Viewer login", { exact: true })).toHaveValue(
    "pixelpilot_with_a_long_username",
  );
  await page
    .getByRole("group", { name: "Read this page" })
    .getByRole("button", { name: "Oldest first", exact: true })
    .click();
  await expect(page.locator(".conversation-line").first()).toHaveAttribute(
    "data-continuation",
    "false",
  );
});
test("visible analytics controls send the selected interval and keep podium rows compact", async ({
  page,
}) => {
  await correctionApi(page);
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.goto("/leaderboard");
  const request = page.waitForRequest(
    (r) =>
      r.url().includes("/chat/dashboard") &&
      r.url().includes("bucket_hours=24"),
  );
  await page
    .getByRole("group", { name: "Aggregation step" })
    .getByRole("button", { name: "24h", exact: true })
    .click();
  await request;
  await page
    .getByRole("group", { name: "Measure", exact: true })
    .getByRole("button", { name: "Characters", exact: true })
    .click();
  await expect(page.locator(".chart-readout")).toContainText("characters");
  await page.getByRole("switch", { name: "Hide quiet intervals" }).check();
  await expect(page.locator(".chart-axis")).toContainText(
    "does not represent elapsed time",
  );
  await expect(page.locator(".participant-table>a[data-rank]")).toHaveCount(3);
  await capture(page, "analytics-controls", 768);
});
test("history restores artwork and links to the current public reward", async ({
  page,
}) => {
  await correctionApi(page);
  await page.goto("/me");
  await expect(page.locator(".identity-avatar img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".history-art img")
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.locator(".viewer-history-row>summary").first().click();
  await page.locator(".history-reward-link").first().click();
  await expect(page).toHaveURL(/rewards\//);
  await expect(page.locator(".reward-showcase")).toContainText("Redline drop");
});

test("behavior editor preserves hidden configuration, currency units and draft reset", async ({
  page,
}) => {
  const mutations = await correctionApi(page);
  await page.goto("/rewards");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Redline drop", exact: true }).click();
  await page.getByRole("tab", { name: "Edit Reward", exact: true }).click();
  const nav = page.getByRole("navigation", {
    name: "Configure behavior sections",
  });
  await nav.getByRole("button", { name: /Points & market/ }).click();
  await page.getByText("Market protection", { exact: true }).click();
  await page.locator("#min_market_price").fill("1.25");
  await page.locator("#max_market_price").fill("3.50");
  await nav.getByRole("button", { name: /Viewer eligibility/ }).click();
  await page
    .getByRole("switch", { name: "Require chat activity", exact: true })
    .check();
  await page.locator("#chat_min_messages").fill("12");
  await page.locator("#chat_min_characters").fill("500");
  await page.getByRole("button", { name: "Either rule", exact: true }).click();
  await nav.getByRole("button", { name: /Usage limits/ }).click();
  await page
    .getByText("Rolling & lifetime purchase limits", { exact: false })
    .click();
  await page.getByLabel("user hours 1", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Review reward", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "12 messages or 500 characters",
  );
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect.poll(() => mutations.length).toBe(1);
  expect(mutations[0].body).toMatchObject({
    min_market_price: 1250,
    max_market_price: 3500,
    chat_min_messages: 12,
    chat_min_characters: 500,
    chat_logical_operator: "OR",
    purchase_limits: {
      user: [{ max_redemptions: 2, window_hours: null }],
      global: [{ max_redemptions: 20, window_hours: 168 }],
    },
  });
  expect(mutations[0].body).not.toHaveProperty("twitch_title");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Redline drop", exact: true }).click();
  await page.getByRole("tab", { name: "Edit Reward", exact: true }).click();
  await nav.getByRole("button", { name: /Viewer eligibility/ }).click();
  await page
    .getByRole("switch", { name: "Require chat activity", exact: true })
    .check();
  await page.getByRole("button", { name: "Reset draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await nav.getByRole("button", { name: /Viewer eligibility/ }).click();
  await expect(
    page.getByRole("switch", { name: "Require chat activity", exact: true }),
  ).not.toBeChecked();
});

test("large pool discovery preserves probabilities and retained case details stay inspectable", async ({
  page,
}) => {
  await correctionApi(page);
  await page.goto(`/c/necko/rewards/${richRewards[2].twitch_id}`);
  await expect(page.locator(".item-manifest li")).toHaveCount(12);
  await page.getByRole("button", { name: /Show more items/ }).click();
  await expect(page.locator(".item-manifest li")).toHaveCount(24);
  await page.getByLabel("Find an item", { exact: true }).fill("Atheris");
  await expect(page.locator(".item-manifest li")).toHaveCount(7);
  await expect(page.locator(".item-manifest")).toContainText("1.71%");
  await page.goto("/redemptions?status=MANUAL_HOLD");
  await page.locator(".ledger-summary").first().click();
  await page.getByText("All retained events (8)", { exact: true }).click();
  await expect(page.locator(".redemption-case")).toContainText(
    "REDEMPTION_STATUS_CHANGED",
  );
  await expect(page.locator(".redemption-case")).toContainText(
    "Earlier events are not reconstructed",
  );
});

for (const path of ["/chat", "/chat/users/900?view=chat"])
  test(`follow latest keeps one meaning and pauses/resumes polling in ${path}`, async ({
    page,
  }) => {
    await correctionApi(page);
    await page.setViewportSize({ width: 390, height: 960 });
    await page.clock.install();
    let requests = 0;
    page.on("request", (r) => {
      if (r.url().includes("/chat/messages")) requests++;
    });
    await page.goto(path);
    await expect(page.locator(".conversation-line").first()).toBeVisible();
    const follow = page.getByRole("switch", {
      name: "Follow latest",
      exact: true,
    });
    await expect(follow).not.toBeChecked();
    await expect(page.locator(".chat-live-status")).toContainText(
      "automatic updates are off",
    );
    let count = requests;
    await page.clock.runFor(11000);
    expect(requests).toBe(count);
    await follow.check();
    await expect(follow).toBeChecked();
    await expect(page.locator(".chat-live-status")).toContainText(
      "every 10 seconds",
    );
    await page.clock.runFor(11000);
    await expect.poll(() => requests).toBeGreaterThan(count);
    await page.getByRole("button", { name: "Older", exact: true }).click();
    await expect(page).toHaveURL(/chatPage=1/);
    await expect(
      page.getByRole("button", { name: "Older", exact: true }),
    ).toBeEnabled();
    await expect(follow).toBeChecked();
    await expect(page.locator(".chat-live-status")).toContainText(
      "Paused while reading older messages",
    );
    count = requests;
    await page.clock.runFor(21000);
    expect(requests).toBe(count);
    await page.locator(".chat-live-status").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/corrections/390-follow-paused-${path === "/chat" ? "channel" : "viewer"}.png`,
    });
    await page
      .getByRole("button", { name: "Return to latest", exact: false })
      .click();
    await expect(page).not.toHaveURL(/chatPage/);
    await expect(page.locator(".chat-live-status")).toContainText(
      "every 10 seconds",
    );
    count = requests;
    await page.clock.runFor(11000);
    await expect.poll(() => requests).toBeGreaterThan(count);
    await follow.uncheck();
    count = requests;
    await page.clock.runFor(21000);
    expect(requests).toBe(count);
    await expect(follow).not.toBeChecked();
    await expect(page.locator(".chat-live-status")).toContainText(
      "automatic updates are off",
    );
    if (path.includes("users"))
      await expect(
        page.locator(".conversation-line[data-continuation=true]"),
      ).toHaveCount(0);
  });

test("profile surfaces retain a bounded, balanced composition", async ({
  page,
}) => {
  await correctionApi(page);
  for (const width of [1920, 1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, path] of [
      ["global-one", "/me"],
      ["channel", "/c/necko/profile"],
      ["operator", "/chat/users/900"],
    ]) {
      await page.goto(path);
      await expect(page.locator(".identity-avatar img")).toBeVisible();
      await capture(page, name, width);
      const main = await page.locator("main").boundingBox();
      const profile = await page.locator(".profile-shell").boundingBox();
      expect(profile!.width).toBeLessThanOrEqual(1240);
      expect(
        Math.abs(
          2 * (profile!.x - main!.x) - (main!.width - profile!.width),
        ),
      ).toBeLessThanOrEqual(1);
      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      expect(overflow.document, path).toBeLessThanOrEqual(overflow.viewport + 1);
    }
  }
});

test("public price units and unpublished chances remain truthful", async ({
  page,
}) => {
  await correctionApi(page);
  await page.goto(`/c/necko/rewards/${richRewards[0].twitch_id}`);
  await expect(page.locator(".manifest-price")).toContainText("$2.45");
  await page.route("**/api/v1/public/broadcasters/*/rewards**", (route) =>
    route.fulfill({
      json: route.request().url().split("?")[0].endsWith("/rewards")
        ? []
        : {
            twitch_id: richRewards[2].twitch_id,
            twitch_title: "Private chances",
            reward_type: "POOL",
            pricing_mode: "MANUAL",
            is_paused: true,
            pause_reason: "NO_MONEY",
            currency: "USD",
            cost_points: 1000,
            pool_items: [
              {
                market_hash_name: "AK-47",
                current_market_price: 2.5,
                chance_percentage: null,
              },
            ],
          },
    }),
  );
  await page.goto(`/c/necko/rewards/${richRewards[2].twitch_id}`);
  await expect(page.locator(".manifest-price")).toContainText("$2.50");
  await expect(page.locator(".manifest-chance strong")).toHaveText("—");
  await expect(page.locator(".reward-showcase")).toContainText(
    "market balance is insufficient",
  );
});

test("mobile advanced behavior and technical item register remain usable", async ({
  page,
}) => {
  await correctionApi(page);
  await page.setViewportSize({ width: 390, height: 960 });
  await page.goto("/rewards");
  await page.getByRole("button", { name: "AWP surprise", exact: true }).click();
  await page
    .locator(".effective-reward h2")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page
    .getByRole("dialog")
    .screenshot({
      path: "test-results/corrections/390-configured-pool-start.png",
    });
  await page.getByRole("tab", { name: "Edit Reward", exact: true }).click();
  const nav = page.getByRole("navigation", {
    name: "Configure behavior sections",
  });
  await nav.getByRole("button", { name: /Viewer eligibility/ }).click();
  await page
    .getByRole("switch", { name: "Require chat activity", exact: true })
    .check();
  await page.locator("#chat_min_messages").fill("5");
  await page.locator("#chat_min_characters").fill("200");
  await page.locator("#chat_min_messages").scrollIntoViewIfNeeded();
  await page
    .getByRole("dialog")
    .screenshot({
      path: "test-results/corrections/390-eligibility-enabled.png",
    });
  await nav.getByRole("button", { name: /Usage limits/ }).click();
  await page
    .getByText("Rolling & lifetime purchase limits", { exact: false })
    .click();
  await page
    .getByLabel("user hours 1", { exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("dialog")
    .screenshot({ path: "test-results/corrections/390-rolling-limits.png" });
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
});
