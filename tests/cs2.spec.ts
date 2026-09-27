import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";

test("pairing renews, detects desktop, and revokes without unnecessary codes", async ({ page }) => {
  await mockApi(page);
  let paired = false;
  let codes = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) { codes++; return route.fulfill({ json: { code: codes === 1 ? "ABCD-2345" : "EFGH-6789", expires_at: new Date(Date.now() + (codes === 1 ? 2000 : 300000)).toISOString() } }); }
    if (route.request().method() === "DELETE") paired = false;
    return route.fulfill({ json: { device: paired ? { id: "device", app_version: "0.1.0", created_at: new Date().toISOString(), last_seen_at: new Date().toISOString() } : null } });
  });
  await page.goto("/cs2");
  await expect(page.getByRole("link", { name: "Open CS2 Integration", exact: true })).toHaveAttribute("href", "necko7-cs2i://pair?code=ABCD-2345");
  await expect(page.getByText("EFGH-6789", { exact: true })).toBeVisible({ timeout: 6000 });
  paired = true;
  await expect(page.getByRole("heading", { name: "Paired", exact: true })).toBeVisible({ timeout: 18000 });
  expect(codes).toBe(2);
  await expect(page.getByText("Desktop recently connected")).toBeVisible();
  await page.getByRole("button", { name: "Unpair desktop" }).click();
  await expect(page.getByRole("link", { name: "Open CS2 Integration", exact: true })).toBeVisible();
  expect(codes).toBe(3);
});
for (const role of ["EDITOR", "VIEWER"]) test(`${role} cannot manage CS2`, async ({ page }) => {
  await mockApi(page, { role });
  let calls = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => { calls++; return route.fulfill({ status: 403, json: {} }); });
  await page.goto("/cs2"); await expect(page).toHaveURL(/\/channels$/);
  expect(calls).toBe(0);
});
test("backend failures are recoverable", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/v1/broadcasters/123/cs2", route => route.fulfill({ status: 503, json: {} }));
  await page.goto("/cs2"); await expect(page.getByRole("alert")).toContainText("Unable to update");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
});
