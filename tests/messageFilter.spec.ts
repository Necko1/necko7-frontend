import { test, expect } from "@playwright/test";
import { scriptsApi } from "./scriptFixtures";
import { scriptCompletionOwner } from "../src/lib/scriptCompletion";

test("completion resolves native builder chains without interpreting pattern punctuation", () => {
  expect(scriptCompletionOwner("MessageFilter::")).toBe("MessageFilter");
  expect(scriptCompletionOwner("MessageFilter::any().")).toBe("MessageFilter");
  expect(scriptCompletionOwner("ActivityFilter::")).toBe("ActivityFilter");
  expect(scriptCompletionOwner("ActivityFilter::create().min_messages(3).during(Duration::from_mins(30)).")).toBe("ActivityFilter");
  expect(scriptCompletionOwner("MessageFilter::any().contains(\"keyword\").during(Duration::from_mins(10)).")).toBe("MessageFilter");
  expect(scriptCompletionOwner("UserFilter::create().activity(ActivityFilter::create().min_messages(3)).")).toBe("UserFilter");
  expect(scriptCompletionOwner('let f = MessageFilter::all()\n .contains("динозавр()\\\".")\n .case_sensitive(true).st')).toBe("MessageFilter");
  expect(scriptCompletionOwner('UserFilter::create().messages(MessageFilter::any().equals("ёж")).')).toBe("UserFilter");
  expect(scriptCompletionOwner('MessageFilter::any().contains("(") /* ignored ) */ .')).toBe("MessageFilter");
  expect(scriptCompletionOwner("ctx.current_match.")).toBe("ctx.current_match");
  expect(scriptCompletionOwner("log.")).toBe("log");
  expect(scriptCompletionOwner("message_filter.")).toBe("message_filter");
  expect(scriptCompletionOwner("chat.recent_chatters().")).toBeUndefined();
  expect(scriptCompletionOwner("MessageFilter.any().")).toBeUndefined();
});

test("Monaco exposes MessageFilter constructors and chained clauses with exact case help", async ({ page }) => {
  await scriptsApi(page);
  await page.goto("/scripts/editor");
  const editor = page.locator(".monaco-editor");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nMessageFilter::");
  await page.keyboard.press("Control+Space");
  await expect(page.locator(".suggest-widget.visible")).toContainText("any");
  await expect(page.locator(".suggest-widget.visible")).toContainText("all");
  await expect(page.locator(".suggest-widget.visible")).not.toContainText("contains");
  await page.keyboard.press("Escape");
  await page.keyboard.type("any().");
  await page.keyboard.press("Control+Space");
  for (const name of ["contains", "starts_with", "ends_with", "equals", "case_sensitive", "during"]) {
    await expect(page.locator(".suggest-widget.visible")).toContainText(name);
  }
  await expect(page.locator('.suggest-widget.visible .monaco-list-row[aria-label^="any,"]')).toHaveCount(0);
  await expect(page.locator('.suggest-widget.visible .monaco-list-row[aria-label^="all,"]')).toHaveCount(0);
  await page.screenshot({ path: "../.qa/message-filter/monaco-completion.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await page.keyboard.type("case_sensitive(false)");
  await page.keyboard.press("ArrowLeft");
  for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Control+i");
  const hover = page.locator(".monaco-hover:not(.hidden)");
  await expect(hover).toContainText("EVERY clause");
  await expect(hover).toContainText("BEFORE and AFTER");
  await expect(hover).toContainText("false is the default");
  await expect(hover).toContainText("ДИНОЗАВР");
  await expect(hover).toContainText("Set the case mode");
  expect(await hover.locator("p").filter({ hasText: "Set the case mode" }).count()).toBe(1);
  expect(await hover.evaluate(element => {
    const text = [...element.querySelectorAll("p")].find(p => p.textContent?.includes("Set the case mode"));
    if (!text) return false;
    const box = text.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight && document.elementFromPoint(box.left + 4, box.top + 4)?.closest(".monaco-hover") !== null;
  })).toBe(true);
  await page.screenshot({ path: "../.qa/message-filter/monaco-case-hover.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.scrollIntoViewIfNeeded();
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Control+i");
  await expect(hover).toBeVisible();
  expect(await hover.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
  })).toBe(true);
  await page.screenshot({ path: "../.qa/message-filter/monaco-narrow-hover.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(hover).toHaveCount(0);
});

test("Monaco exposes ActivityFilter methods and explains independent optional windows", async ({ page }) => {
  await scriptsApi(page);
  await page.goto("/scripts/editor");
  const editor = page.locator(".monaco-editor");
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nActivityFilter::");
  await page.keyboard.press("Control+Space");
  await expect(page.locator(".suggest-widget.visible")).toContainText("create");
  await expect(page.locator(".suggest-widget.visible")).not.toContainText("min_messages");
  await page.keyboard.press("Escape");
  await page.keyboard.type("create().");
  await page.keyboard.press("Control+Space");
  for (const name of ["min_messages", "min_characters", "during"]) {
    await expect(page.locator(".suggest-widget.visible")).toContainText(name);
  }
  await page.screenshot({ path: "../.qa/filter-windows/monaco-activity-completion.png", animations: "disabled" });
  await page.keyboard.press("Escape");
  await page.keyboard.type("during(Duration::from_mins(30))");
  await page.keyboard.press("Home");
  // Place the cursor inside the method name, not Duration's constructor.
  for (let i = 0; i < 27; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Control+i");
  const hover = page.locator(".monaco-hover:not(.hidden)");
  await expect(hover).toContainText("independent");
  await expect(hover).toContainText("Omit .during(...)");
  await expect(hover).toContainText("all retained channel history");
  await expect(hover).toContainText("never inherits the candidate window");
  await page.screenshot({ path: "../.qa/filter-windows/monaco-activity-hover.png", animations: "disabled" });
  await page.keyboard.press("Escape");
});
