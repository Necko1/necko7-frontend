import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import ts from "typescript";
import { scriptsApi, choose } from "./scriptFixtures";
import { scriptCopy, scriptsEn, scriptsRu } from "../src/i18n/scripts";

const shot = (page: Page, name: string) => page.screenshot({ path: `.qa/scripts-ru/${name}.png`, animations: "disabled" });
async function russian(page: Page, options: Parameters<typeof scriptsApi>[1] = {}) {
  const fixture = await scriptsApi(page, options);
  await page.addInitScript(() => localStorage.setItem("necko_lang", "ru"));
  return fixture;
}
const node = (page: Page, path: string) => page.locator(`.script-tree-node[data-path="${path}"]`);
const menu = (page: Page) => page.getByRole("menu", { name: "Действия в дереве файлов" });

test("Scripts dictionary preserves keys/interpolation and every static UI label is translated", () => {
  expect(Object.keys(scriptsRu)).toEqual(Object.keys(scriptsEn));
  for (const [key, [en, ru]] of Object.entries(scriptCopy)) {
    expect(ru.trim(), key).not.toBe("");
    expect([...ru.matchAll(/\{\{(.*?)\}\}/g)].map(m => m[1]).sort(), key)
      .toEqual([...en.matchAll(/\{\{(.*?)\}\}/g)].map(m => m[1]).sort());
  }
  const files = ["src/pages/ScriptsPage.tsx", "src/pages/Cs2Page.tsx", ...fs.readdirSync("src/components/scripts").filter(f => f.endsWith(".tsx")).map(f => "src/components/scripts/" + f)];
  for (const file of files) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isJsxText(node) && /[a-zA-Z]/.test(node.getText())) expect(node.getText().trim(), file).toBe("Rhai");
      if (ts.isJsxAttribute(node) && ["title", "label", "aria-label", "placeholder"].includes(node.name.getText()) && node.initializer && ts.isStringLiteral(node.initializer)) {
        expect(node.initializer.text, file).not.toMatch(/[a-zA-Z]/);
      }
      if (ts.isStringLiteral(node) && node.text.startsWith("scripts.") && !node.text.startsWith("scripts.values.")) {
        const key = node.text.slice("scripts.".length);
        expect(key === "results" || Object.hasOwn(scriptCopy, key), `${file}: ${key}`).toBe(true);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
});

for (const [section, heading] of [["editor", "Скрипты"], ["storage", "Хранилище"], ["matches", "Матчи"], ["scheduler", "Планировщик"], ["logs", "Логи выполнения"]]) {
  test(`Russian ${section} navigation and records`, async ({ page }) => {
    await russian(page);
    await page.goto(`/scripts/${section}`);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Скрипты", exact: true })).toContainText("Интеграция с CS2РедакторХранилищеМатчиПланировщикЛоги");
    await expect(page.locator('aside a[href="/scripts/editor"]')).toHaveText("Скрипты");
    if (section === "editor") await expect(page.locator(".monaco-editor")).toBeVisible();
    else await expect(page.locator("time").first()).toContainText("назад");
    await expect(page.locator("main")).not.toContainText("scripts.");
    await shot(page, section);
  });
}

test("language switch preserves unsaved code; project creation, validation and history are Russian", async ({ page }) => {
  const { actions, data } = await scriptsApi(page);
  await page.goto("/scripts/editor");
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// keep this draft");
  await page.getByRole("button", { name: "Русский язык", exact: true }).click();
  await expect(page.getByRole("button", { name: "Опубликовать", exact: true })).toBeDisabled();
  await page.keyboard.press("Control+s");
  await expect.poll(() => actions.map(a => a.action)).toEqual(["save"]);
  expect(data.projects[0].draft["main.rhai"]).toContain("// keep this draft");
  await expect(page.getByText("Черновик сохранён", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "История версий", exact: true }).click();
  await page.getByRole("button", { name: /Версия 1/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Опубликованные версии неизменяемы.");
  await expect(page.getByText("// Published version 1", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Активировать версию 1", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Активировать версию 1?" })).toContainText("отложенные задания сохранят закреплённую версию");
  await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Создать проект", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Создать проект" });
  await dialog.getByRole("button", { name: "Создать проект", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Введите название проекта.");
  await dialog.getByLabel("Название проекта").fill("Мой проект");
  await shot(page, "project-dialog");
  await dialog.getByRole("button", { name: "Создать проект", exact: true }).click();
  await expect.poll(() => data.projects[0].name).toBe("Мой проект");
});

test("Russian file/folder/background menus, protections and path errors", async ({ page }) => {
  await russian(page); await page.goto("/scripts/editor");
  await node(page, "main.rhai").click({ button: "right" });
  for (const label of ["Переименовать", "Переместить...", "Удалить"]) await expect(menu(page).getByRole("menuitem", { name: label, exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await node(page, "helpers.rhai").click({ button: "right" });
  await shot(page, "file-menu");
  await menu(page).getByRole("menuitem", { name: "Переименовать", exact: true }).click();
  await page.getByLabel("Название", { exact: true }).fill("tools.rhai");
  await page.getByRole("dialog").getByRole("button", { name: "Переименовать", exact: true }).click();
  await expect(node(page, "tools.rhai")).toBeVisible();
  await node(page, "events").click({ button: "right" });
  await shot(page, "folder-menu");
  await menu(page).getByRole("menuitem", { name: "Новый файл", exact: true }).click();
  await page.getByLabel("Путь к файлу").fill("../bad");
  await page.getByRole("dialog").getByRole("button", { name: "Создать файл", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Введите относительный путь");
  await page.getByLabel("Путь к файлу").fill("events/new.rhai");
  await page.getByRole("dialog").getByRole("button", { name: "Создать файл", exact: true }).click();
  await expect(node(page, "events/new.rhai")).toBeVisible();
  await page.locator(".script-tree").click({ button: "right", position: { x: 120, y: 240 } });
  await shot(page, "background-menu");
  await expect(menu(page).getByRole("menuitem", { name: "Переименовать" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await node(page, "events/new.rhai").click({ button: "right" });
  await menu(page).getByRole("menuitem", { name: "Удалить", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Удалить файл или папку?" })).toContainText("events/new.rhai");
  await page.getByRole("dialog").getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(node(page, "events/new.rhai")).toHaveCount(0);
});

test("Russian storage editing and clear confirmation preserve JSON and confirmation token", async ({ page }) => {
  const { actions } = await russian(page); await page.goto("/scripts/storage");
  await page.getByRole("button", { name: "Изменить round_rewards", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Изменить значение в хранилище" });
  await expect(dialog).toContainText("Round rewards");
  await dialog.getByLabel("Значение JSON").fill("{bad");
  await dialog.getByRole("button", { name: "Сохранить значение" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Введите корректный JSON.");
  await dialog.getByLabel("Значение JSON").fill('{"user_text":"hello"}');
  await dialog.getByRole("button", { name: "Сохранить значение" }).click();
  expect(actions.at(-1)?.value).toEqual({ user_text: "hello" });
  await choose(page, "Фильтр по проекту", "Round rewards");
  await page.getByRole("button", { name: "Очистить хранилище", exact: true }).click();
  await page.getByLabel("Введите CLEAR для подтверждения").fill("CLEAR");
  await shot(page, "storage-confirmation");
  await page.getByRole("dialog").getByRole("button", { name: "Очистить хранилище", exact: true }).click();
  expect(actions.at(-1)?.confirmation).toBe("CLEAR");
});

test("Russian match unknown/zero/final totals and raw IDs remain distinct", async ({ page }) => {
  const { data } = await russian(page);
  Object.assign(data.matches[0].data, { local_summary: { final: true, stats: { kills: 8, assists: 2, deaths: 11, mvps: 5, score: 26 } } });
  Object.assign(data.matches[0].data.rounds[4], { side_swap_before: { before: { ct: 2, t: 6 }, after: { ct: 6, t: 2 } } });
  await page.goto("/scripts/matches");
  await page.getByRole("button", { name: "de_anubis", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "de_anubis" });
  await expect(dialog).toContainText("Итоги локального игрока за матч");
  await expect(dialog.locator(".script-rounds tbody tr").nth(0)).toContainText("0 / 0");
  await expect(dialog.locator(".script-rounds tbody tr").nth(3)).toContainText("Неизвестно / Неизвестно");
  await expect(dialog).toContainText("Смена сторон: 2 : 6 → 6 : 2");
  await dialog.getByRole("button", { name: "1", exact: true }).click();
  await expect(dialog).toContainText("Конец раунда");
  await shot(page, "match-inspector");
  await dialog.getByText("Полные нормализованные данные матча", { exact: true }).click();
  await expect(dialog.locator("details pre").last()).toContainText('"round_ended"');
  await expect(dialog.locator("details pre").last()).toContainText('"kills": null');
});

test("Russian scheduler and logs keep project, job and user messages intact", async ({ page }) => {
  await russian(page); await page.goto("/scripts/scheduler");
  await expect(page.getByText("Проект выключен", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "retry_round_reward", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("После повторного включения проекта");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Запустить сейчас", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Запустить задание сейчас?" })).toContainText("закреплённую версию 1 проекта «Round rewards»");
  await page.keyboard.press("Escape");
  await page.goto("/scripts/logs");
  await expect(page.locator(".script-log-register")).toContainText("3 результата");
  await page.locator(".script-execution-line").first().click();
  await expect(page.getByRole("dialog")).toContainText("Round reward would be delivered");
  await expect(page.getByRole("dialog")).toContainText("Информация");
  await shot(page, "execution-inspector");
});

test("Russian CS2 pairing, retry, check feedback and owner/editor protections", async ({ page }) => {
  await russian(page);
  let failed = true;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) return route.fulfill(failed ? { status: 503, json: {} } : { json: { code: "ABCD-2345", expires_at: new Date(Date.now() + 300000).toISOString() } });
    return route.fulfill({ json: { device: null } });
  });
  await page.goto("/scripts/cs2");
  await expect(page.getByRole("alert")).toContainText("Не удалось обновить интеграцию с CS2");
  failed = false;
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByLabel("Код подключения")).toHaveText("ABCD-2345");
  await expect(page.getByRole("link", { name: "Открыть приложение CS2", exact: true })).toHaveAttribute("href", "necko7-cs2i://pair?code=ABCD-2345");
  await page.getByRole("button", { name: "Проверить подключение" }).click();
  await expect(page.getByRole("status")).toContainText("Приложение ещё не подключено");
  await shot(page, "pairing");
  await page.getByRole("button", { name: "English language", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("No desktop connected yet");
  await page.getByRole("button", { name: "Русский язык", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "pairing-narrow");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.unroute("**/api/v1/broadcasters/123/cs2**");
  await page.route("**/api/v1/broadcasters/123/cs2**", route => route.fulfill({ json: {
    device: { id: "device", app_version: "0.1.0", last_seen_at: new Date().toISOString(), last_heartbeat_at: new Date().toISOString() },
  } }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Подключено", exact: true })).toBeVisible();
  await expect(page.getByText("Приложение: В сети", { exact: true })).toBeVisible();
  await expect(page.getByText("Данные CS2: Получаем данные CS2", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Последние данные получены /)).toBeVisible();
  await page.getByRole("button", { name: "Отключить приложение", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Отключить приложение?" })).toContainText("Это устройство перестанет передавать события CS2");
  await page.keyboard.press("Escape");
  await shot(page, "paired-narrow");
});

test("Russian Editor access shows status without pairing authority", async ({ page }) => {
  await russian(page, { role: "EDITOR" });
  let credentials = 0;
  await page.route("**/api/v1/broadcasters/123/cs2**", route => {
    if (route.request().url().endsWith("/pairing")) credentials++;
    return route.fulfill({ json: { device: null } });
  });
  await page.goto("/scripts/cs2");
  await expect(page.getByText("Подключением приложения управляет владелец канала.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Код подключения")).toHaveCount(0);
  await expect(page.locator('a[href^="necko7-cs2i:"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Скачать приложение" })).toBeVisible();
  expect(credentials).toBe(0);
});

for (const section of ["editor", "storage", "matches", "scheduler", "logs"]) {
  test(`Russian empty ${section}`, async ({ page }) => {
    await russian(page, { empty: true }); await page.goto(`/scripts/${section}`);
    await expect(page.locator(".script-empty:visible")).toBeVisible();
    await expect(page.locator(".script-empty:visible")).not.toContainText(/No |Values appear|Create a/);
    if (section !== "editor") await expect(page.locator(".script-records")).not.toContainText("scripts.");
  });
}

test("Russian editor, record filters and inspectors fit narrow widths", async ({ page }) => {
  await russian(page); await page.setViewportSize({ width: 390, height: 844 });
  for (const section of ["editor", "storage", "scheduler", "logs", "matches"]) {
    await page.goto(`/scripts/${section}`);
    await expect(page.getByRole("heading", { name: "Скрипты", exact: true })).toBeVisible();
    if (section === "editor") await expect(page.locator(".monaco-editor")).toBeVisible();
    else await expect(page.locator(".script-records")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), section).toBe(true);
    await shot(page, `${section}-narrow`);
  }
});

test("Monaco uses the bundled Russian find widget without changing Rhai", async ({ page }) => {
  await russian(page); await page.goto("/scripts/editor");
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Control+f");
  await expect(page.locator(".find-widget")).toBeVisible();
  await expect(page.locator(".find-widget").getByRole("textbox", { name: "Найти", exact: true })).toBeVisible();
  await shot(page, "monaco-find");
});
