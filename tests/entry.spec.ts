import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";
for (const width of [1440, 390]) {
  test(`entry surfaces preserve distinct authorization purposes at ${width}px`, async ({
    page,
  }) => {
    await mockApi(page, { guest: true });
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: "Sign in with Twitch" }),
    ).toHaveAttribute("href", /\/auth\/login$/);
    await expect(
      page.getByRole("link", { name: "Connect my Twitch channel" }),
    ).toHaveAttribute("href", /\/auth\/connect$/);
    await expect(
      page.getByText("For viewers, editors and returning streamers.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/product/login-${width}.png`,
      fullPage: true,
    });
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await page.goto("/init-bot/");
    await expect(
      page.getByRole("heading", { name: "Initialize the bot integration" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Authorize bot on Twitch" }),
    ).toHaveAttribute("href", /\/auth\/init\/bot$/);
    await expect(
      page.getByText("TWITCH_CLIENT_SECRET", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/product/setup-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test("bootstrap never offers authorization when its state cannot be verified", async ({
  page,
}) => {
  await mockApi(page, { guest: true, fail: "/users/me" });
  await page.goto("/init-bot/");
  await expect(page.getByRole("alert")).toContainText(
    "Setup state is unavailable",
  );
  await expect(
    page.getByRole("link", { name: "Authorize bot on Twitch" }),
  ).toHaveCount(0);
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
