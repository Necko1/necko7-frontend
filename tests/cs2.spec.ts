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
  await expect(page.getByText("CS2 data: Receiving CS2 data")).toBeVisible();
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

test("focus and Retry reuse a valid code without destructive rotation", async ({ page }) => {
  await mockApi(page);
  let codes = 0;
  let checks = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) {
      codes++;
      if (codes > 1) return route.fulfill({ status: 429, json: {} });
      return route.fulfill({ json: { code: "4EME-GX7G", expires_at: new Date(Date.now()+300000).toISOString() } });
    }
    checks++; return route.fulfill({ json: { device: null } });
  });
  await page.goto("/cs2");
  await expect(page.getByText("4EME-GX7G", { exact: true })).toBeVisible();
  const before = checks;
  // React Query v5 observes visibilitychange, not a window focus event alone.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    window.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    window.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect.poll(() => checks).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("4EME-GX7G", { exact: true })).toBeVisible();
  expect(codes).toBe(1);
  await expect(page.getByText("Changes were not saved. Please try again.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download desktop app" })).toHaveAttribute("href", "https://github.com/Necko1/necko7-cs2i/releases/latest/download/necko7-cs2i-windows-x64-setup.exe");
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(0);
});

test("pairing request failure recovers with Retry and CS2-specific errors", async ({ page }) => {
  await mockApi(page);
  let codes = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) {
      if (++codes === 1) return route.fulfill({ status: 503, json: {} });
      return route.fulfill({ json: { code: "4EME-GX7G", expires_at: new Date(Date.now()+300000).toISOString() } });
    }
    return route.fulfill({ json: { device: null } });
  });
  await page.goto("/cs2");
  await expect(page.getByRole("alert")).toContainText("CS2 Integration");
  await expect(page.getByText("Changes were not saved. Please try again.")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("4EME-GX7G", { exact: true })).toBeVisible();
  expect(codes).toBe(2);
});

test("pairing consumed during rotation reconciles Paired without an error", async ({ page }) => {
  await mockApi(page);
  let paired = false;
  let codes = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) {
      if (++codes === 1) return route.fulfill({ json: { code: "4EME-GX7G", expires_at: new Date(Date.now()+2000).toISOString() } });
      paired = true; return route.fulfill({ status: 400, json: {} });
    }
    return route.fulfill({ json: { device: paired ? { id: "device", app_version: "test", last_seen_at: null, last_heartbeat_at: new Date().toISOString() } : null } });
  });
  await page.goto("/cs2");
  await expect(page.getByText("4EME-GX7G", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Paired", exact: true })).toBeVisible({ timeout: 6000 });
  expect(codes).toBe(2);
  await expect(page.getByText("Desktop: Online", { exact: true })).toBeVisible();
  await expect(page.getByText("CS2 data: Waiting for CS2", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open CS2 Integration", exact: true })).toHaveCount(0);
  await expect(page.getByText("Changes were not saved. Please try again.")).toHaveCount(0);
});

test("rate-limited renewal recovers automatically without a save toast", async ({ page }) => {
  await mockApi(page);
  let codes = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) {
      if (++codes === 1) return route.fulfill({ status: 429, json: {} });
      return route.fulfill({ json: { code: "4EME-GX7G", expires_at: new Date(Date.now()+300000).toISOString() } });
    }
    return route.fulfill({ json: { device: null } });
  });
  await page.goto("/cs2");
  await expect(page.getByText("4EME-GX7G", { exact: true })).toBeVisible({ timeout: 15000 });
  expect(codes).toBe(2);
  await expect(page.getByText("Changes were not saved. Please try again.")).toHaveCount(0);
});

test("server-side revocation discards a consumed cached code and obtains a new one", async ({ page }) => {
  await mockApi(page);
  let paired = false;
  let codes = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) return route.fulfill({ json: { code: ++codes === 1 ? "4EME-GX7G" : "ABCD-2345", expires_at: new Date(Date.now()+300000).toISOString() } });
    return route.fulfill({ json: { device: paired ? { id: "device", app_version: "test", last_seen_at: null, last_heartbeat_at: new Date().toISOString() } : null } });
  });
  async function regainFocus() {
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      window.dispatchEvent(new Event("visibilitychange"));
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      window.dispatchEvent(new Event("visibilitychange"));
    });
  }
  await page.goto("/cs2");
  await expect(page.getByText("4EME-GX7G", { exact: true })).toBeVisible();
  paired = true; await regainFocus();
  await expect(page.getByRole("heading", { name: "Paired", exact: true })).toBeVisible();
  paired = false; await regainFocus();
  await expect(page.getByText("ABCD-2345", { exact: true })).toBeVisible();
  expect(codes).toBe(2);
});
