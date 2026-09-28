import {test,expect} from "@playwright/test";
import {scriptsApi} from "./scriptFixtures";
import {movePaths,validPath,isFolderMarker} from "../src/components/scripts/fileTree";

test("path operations reject traversal, collisions, entry moves and recursive moves",()=>{
  const files={"main.rhai":"main","one.rhai":"one","folder/a.rhai":"a"};
  expect(validPath("../evil.rhai")).toBe(false);expect(validPath("folder/../evil.rhai")).toBe(false);
  expect(()=>movePaths(files,[{from:"one.rhai",to:"main.rhai"}])).toThrow();
  expect(()=>movePaths(files,[{from:"main.rhai",to:"folder/main.rhai"}])).toThrow();
  expect(()=>movePaths(files,[{from:"folder",to:"folder/inside"}])).toThrow();
  expect(isFolderMarker("folder/_folder.rhai","// Folder module\n")).toBe(true);
  expect(isFolderMarker("folder/_folder.rhai","fn custom() {}" )).toBe(false);
});
test("dragging into a folder persists every file and keeps its content",async({page})=>{
  const {data}=await scriptsApi(page);await page.goto("/scripts/editor");
  const source=page.locator(".script-tree-node").filter({hasText:"helpers.rhai"});
  const folder=page.locator(".script-tree-node").filter({hasText:/^events$/});
  await source.dragTo(folder);
  await expect(page.getByRole("button",{name:"Save draft"})).toBeEnabled();
  await page.getByRole("button",{name:"Save draft"}).click();
  await expect.poll(()=>data.projects[0].draft["events/helpers.rhai"]).toBe("fn helper() {}");
  expect(data.projects[0].draft).not.toHaveProperty("helpers.rhai");
});
test("Monaco completion and virtual open files preserve unsaved code",async({page})=>{
  await scriptsApi(page);await page.goto("/scripts/editor");await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.locator(".monaco-editor").click();await page.keyboard.press("Control+End");await page.keyboard.type("\nrewards.");await page.keyboard.press("Control+Space");await expect(page.locator(".suggest-widget.visible")).toContainText("set_visible");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+Home");await page.keyboard.press("ArrowDown");await page.keyboard.press("End");
  for(let i=0;i<18;i++)await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Control+k");await page.keyboard.press("Control+i");
  await expect(page.locator(".monaco-hover:not(.hidden)")).toContainText("Script execution log");
  await page.keyboard.press("Escape");await page.getByText("helpers.rhai",{exact:true}).click();await expect(page.locator(".view-lines")).toContainText("fn helper");await page.getByRole("button",{name:"main.rhai",exact:true}).click();await expect(page.locator(".view-lines")).toContainText("rewards.");
});
test("final inspectors, history, test report and dialogs are visually reviewable",async({page})=>{
  await scriptsApi(page);await page.goto("/scripts/editor");await page.getByRole("button",{name:"Version history"}).click();await page.getByRole("dialog",{name:"Version history"}).getByRole("button",{name:/Version 1/}).click();await expect(page.locator(".script-published-code")).toContainText("Published version 1");await expect(page.getByRole("button",{name:"Activate version 1",exact:true})).toBeEnabled();await page.screenshot({path:"../.qa/ui-review/final-history.png"});await page.keyboard.press("Escape");
  await page.getByRole("button",{name:/Test draft/}).click();await page.getByRole("button",{name:"Run dry test"}).click();await expect(page.getByText("Test succeeded",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Run dry test"}).focus();await page.locator(".script-report").scrollIntoViewIfNeeded();await page.screenshot({path:"../.qa/ui-review/final-dry-test.png",animations:"disabled"});
  await page.getByRole("button",{name:"Create project",exact:true}).click();await page.getByLabel("Project name").fill("Late-round rewards");await page.screenshot({path:"../.qa/ui-review/final-create-dialog.png"});await page.keyboard.press("Escape");
  await page.getByRole("link",{name:"Matches",exact:true}).click();await page.getByRole("button",{name:"de_anubis",exact:true}).click();await page.getByRole("dialog",{name:"de_anubis"}).getByRole("button",{name:"4",exact:true}).click();await page.screenshot({path:"../.qa/ui-review/final-match-inspector.png"});await page.keyboard.press("Escape");
  await page.getByRole("link",{name:"Local Storage",exact:true}).click();await page.getByRole("button",{name:"round_rewards",exact:true}).click();await page.screenshot({path:"../.qa/ui-review/final-storage-inspector.png"});await page.keyboard.press("Escape");
  await page.getByRole("navigation",{name:"Scripts",exact:true}).getByRole("link",{name:"Logs",exact:true}).click();await page.locator(".script-execution-line").filter({hasText:"Unknown reward"}).click();await page.screenshot({path:"../.qa/ui-review/final-execution-inspector.png"});
});

test("empty, error, selector and paired integration states are visually reviewable",async({page})=>{
  await scriptsApi(page,{empty:true,createError:true});await page.goto("/scripts/storage");await expect(page.getByRole("heading",{name:"No stored values",exact:true})).toBeVisible();await page.screenshot({path:"../.qa/ui-review/final-storage-empty.png"});
  await page.goto("/scripts/editor");await page.getByRole("button",{name:"Create project",exact:true}).click();await page.getByLabel("Project name").fill("New automation");await page.keyboard.press("Enter");await expect(page.getByRole("alert")).toContainText("already in use");await page.screenshot({path:"../.qa/ui-review/final-create-error.png"});await page.keyboard.press("Escape");
  await scriptsApi(page);await page.goto("/scripts/editor");await page.getByRole("button",{name:/Test draft/}).click();
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await page.getByRole("combobox",{name:"Recorded event"}).click();await expect(page.getByRole("option",{name:/Round ended/})).toBeVisible();
    await expect(page.locator('[data-slot="select-content"]')).toHaveCSS("opacity","1");
    expect(await page.locator('[data-slot="select-content"]').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.screenshot({path:width===1440?"../.qa/ui-review/final-recorded-selector.png":"../.qa/ui-review/final-recorded-selector-mobile.png",animations:"disabled"});await page.keyboard.press("Escape");
  }
  await page.setViewportSize({width:1440,height:900});
  await page.route("**/api/v1/broadcasters/123/cs2",route=>route.fulfill({json:{device:{id:"device",app_version:"0.1.0",last_seen_at:new Date().toISOString(),last_heartbeat_at:new Date().toISOString()}}}));await page.goto("/scripts/cs2");await expect(page.getByRole("heading",{name:"Paired",exact:true})).toBeVisible();await page.screenshot({path:"../.qa/ui-review/final-cs2-paired.png"});
});
